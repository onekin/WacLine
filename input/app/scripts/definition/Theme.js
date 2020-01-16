const jsYaml = require('js-yaml')
const _ = require('lodash')
const Config = require('../Config')
// PVSCL:IFCOND(Dynamic, LINE)
const ColorUtils = require('../utils/ColorUtils')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Code and (ExportGroup or MoodleProvider), LINE)
const Code = require('./Code')
// PVSCL:IFCOND(ExportGroup, LINE)
const LanguageUtils = require('../utils/LanguageUtils')
// PVSCL:ENDCOND
// PVSCL:ENDCOND

class Theme {
  constructor ({
    id,
    name,
    color,
    annotationGuide,
    description = ''/* PVSCL:IFCOND(GSheetProvider and Code) */,
    multivalued,
    inductive/* PVSCL:ENDCOND *//* PVSCL:IFCOND(MoodleProvider) */,
    moodleCriteriaId/* PVSCL:ENDCOND */
  }) {
    this.id = id
    this.name = name
    this.description = description
    this.color = color
    this.annotationGuide = annotationGuide
    // PVSCL:IFCOND(Code,LINE)
    this.codes = []
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(GSheetProvider and Code,LINE)
    this.multivalued = multivalued
    this.inductive = inductive
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(MoodleProvider, LINE)
    this.moodleCriteriaId = moodleCriteriaId
  // PVSCL:ENDCOND
  }

  toAnnotations () {
    let annotations = []
    // Create its annotations
    annotations.push(this.toAnnotation())
    // PVSCL:IFCOND(Code,LINE)
    // Create its children annotations
    for (let i = 0; i < this.codes.length; i++) {
      annotations = annotations.concat(this.codes[i].toAnnotations())
    }
    // PVSCL:ENDCOND
    return annotations
  }

  toAnnotation () {
    let themeTag = Config.namespace + ':' + Config.tags.grouped.group + ':' + this.name
    let motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'codebookDevelopment'
    let tags = [themeTag, motivationTag]
    // PVSCL:IFCOND(MoodleProvider,LINE)
    let cmidTag = 'cmid:' + this.annotationGuide.cmid
    tags.push(cmidTag)
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(GSheetProvider and Code,LINE)
    if (this.multivalued) {
      tags.push(Config.namespace + ':' + Config.tags.statics.multivalued)
    }
    if (this.inductive) {
      tags.push(Config.namespace + ':' + Config.tags.statics.inductive)
    }
    // PVSCL:ENDCOND
    return {
      group: this.annotationGuide.annotationServer.group.id,
      permissions: {
        read: ['group:' + this.annotationGuide.annotationServer.group.id]
      },
      motivation: 'codebookDevelopment',
      references: [],
      tags: tags,
      target: [],
      text: jsYaml.dump({
        id: this.id || ''/* PVSCL:IFCOND(User) */,
        description: this.description/* PVSCL:ENDCOND */
      }),
      uri: this.annotationGuide.annotationServer.group.links.html
    }
  }

  static fromAnnotations () {
    // TODO Xabi
  }

  static fromAnnotation (annotation, annotationGuide = {}) {
    let themeTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':' + Config.tags.grouped.group + ':')
    })
    // PVSCL:IFCOND(GSheetProvider and Code,LINE)
    let multivaluedTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':multivalued')
    })
    let inductiveTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':inductive')
    })
    // PVSCL:ENDCOND
    if (_.isString(themeTag)) {
      let name = themeTag.replace(Config.namespace + ':' + Config.tags.grouped.group + ':', '')
      let config = jsYaml.load(annotation.text)
      // PVSCL:IFCOND(GSheetProvider and Code,LINE)
      // multivalued and inductive
      let multivalued = _.isString(multivaluedTag)
      let inductive = _.isString(inductiveTag)
      // PVSCL:ENDCOND
      if (_.isObject(config)) {
        let description = config.description
        let id = annotation.id
        // PVSCL:IFCOND(MoodleReport,LINE)
        let moodleCriteriaId = config.id
        // PVSCL:ENDCOND
        return new Theme({
          id,
          name,
          description,
          annotationGuide/* PVSCL:IFCOND(GSheetProvider and Code) */,
          multivalued,
          inductive/* PVSCL:ENDCOND *//* PVSCL:IFCOND(MoodleReport) */,
          moodleCriteriaId/* PVSCL:ENDCOND */
        })
      } else {

      }
    } else {
      console.error('Unable to retrieve criteria from annotation')
    }
  }
  // PVSCL:IFCOND(Dynamic, LINE) // Check if it is possible to add codes to the definition model if it is not selected Dynamic feature
  // PVSCL:IFCOND(Code, LINE)

  addCode (code) {
    this.codes.push(code)
    // Re-set colors for each code
    this.reloadColorsForCodes()
  }

  removeCode (code) {
    _.remove(this.codes, code)
    // Re-set colors for each code
    this.reloadColorsForCodes()
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Dynamic, LINE)

  reloadColorsForCodes () {
    this.codes.forEach((code, j) => {
      let alphaForChild = (Config.colors.maxAlpha - Config.colors.minAlpha) / this.codes.length * (j + 1) + Config.colors.minAlpha
      code.color = ColorUtils.setAlphaToColor(this.color, alphaForChild)
    })
  }
  // PVSCL:ENDCOND

  toObjects () {
    let object = {
      name: this.name,
      description: this.description
    }
    // PVSCL:IFCOND(Code, LINE)
    if (this.codes.length > 0) {
      object.codes = []
      // For each level
      for (let i = 0; i < this.codes.length; i++) {
        let code = this.codes[i]
        if (LanguageUtils.isInstanceOf(code, Code)) {
          object.codes.push(code.toObject())
        }
      }
    }
    // PVSCL:ENDCOND
    return object
  }

  toObject () {
    return {
      name: this.name,
      description: this.description,
      id: this.id
    }
  }

  getTags () {
    return [Config.namespace + ':' + Config.tags.grouped.group + ':' + this.name]
  }
  // PVSCL:IFCOND(MoodleProvider, LINE)

  static createThemeFromObject (theme, rubric) {
    theme.annotationGuide = rubric
    // Instance theme object
    let instancedTheme = Object.assign(new Theme(theme))
    // PVSCL:IFCOND(Code, LINE)
    // Instance codes
    for (let i = 0; i < theme.codes.length; i++) {
      instancedTheme.codes[i] = Code.createCodeFromObject(theme.codes[i], instancedTheme)
    }
    // PVSCL:ENDCOND
    return instancedTheme
  }
  // PVSCL:ENDCOND
}

module.exports = Theme
