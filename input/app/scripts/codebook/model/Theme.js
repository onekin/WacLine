const jsYaml = require('js-yaml')
const _ = require('lodash')
const Config = require('../../Config')
// PVSCL:IFCOND(CodebookUpdate, LINE)
const ColorUtils = require('../../utils/ColorUtils')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Hierarchy and (ExportCodebook or MoodleProvider), LINE)
const Code = require('./Code')
// PVSCL:ENDCOND
const LanguageUtils = require('../../utils/LanguageUtils')

class Theme {
  constructor ({
    id,
    name,
    color,
    annotationGuide,
    createdDate = new Date(),
    description = ''/* PVSCL:IFCOND(GoogleSheetProvider and Hierarchy) */,
    multivalued,
    inductive/* PVSCL:ENDCOND *//* PVSCL:IFCOND(MoodleProvider) */,
    moodleCriteriaId/* PVSCL:ENDCOND *//* PVSCL:IFCOND(TopicBased) */,
    isTopic = false/* PVSCL:ENDCOND */
  }) {
    this.id = id
    this.name = name
    this.description = description
    this.color = color
    this.annotationGuide = annotationGuide
    if (LanguageUtils.isInstanceOf(createdDate, Date)) {
      this.createdDate = createdDate
    } else {
      let timestamp = Date.parse(createdDate)
      if (_.isNumber(timestamp)) {
        this.createdDate = new Date(createdDate)
      }
    }
    // PVSCL:IFCOND(Hierarchy,LINE)
    this.codes = []
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(GoogleSheetProvider and Hierarchy,LINE)
    this.multivalued = multivalued
    this.inductive = inductive
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(MoodleProvider, LINE)
    this.moodleCriteriaId = moodleCriteriaId
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(TopicBased, LINE)
    this.isTopic = isTopic
    // PVSCL:ENDCOND
  }

  toAnnotations () {
    let annotations = []
    // Create its annotations
    annotations.push(this.toAnnotation())
    // PVSCL:IFCOND(Hierarchy,LINE)
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
    // PVSCL:IFCOND(GoogleSheetProvider and Hierarchy,LINE)
    if (this.multivalued) {
      tags.push(Config.namespace + ':' + Config.tags.statics.multivalued)
    }
    if (this.inductive) {
      tags.push(Config.namespace + ':' + Config.tags.statics.inductive)
    }
    // PVSCL:ENDCOND
    return {
      id: this.id,
      group: this.annotationGuide.annotationServer.group.id,
      permissions: {
        read: ['group:' + this.annotationGuide.annotationServer.group.id]
      },
      motivation: 'codebookDevelopment',
      references: [],
      tags: tags,
      target: [],
      text: jsYaml.dump({
        id: this.id || ''/* PVSCL:IFCOND(BuiltIn) */,
        description: this.description/* PVSCL:ENDCOND *//* PVSCL:IFCOND(TopicBased) */,
        isTopic: this.isTopic/* PVSCL:ENDCOND */
      }),
      uri: this.annotationGuide.annotationServer.group.links.html
    }
  }

  static fromAnnotation (annotation, annotationGuide = {}) {
    let themeTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':' + Config.tags.grouped.group + ':')
    })
    // PVSCL:IFCOND(GoogleSheetProvider and Hierarchy,LINE)
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
      // PVSCL:IFCOND(GoogleSheetProvider and Hierarchy,LINE)
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
        // PVSCL:IFCOND(TopicBased,LINE)
        let isTopic = config.isTopic
        // PVSCL:ENDCOND
        return new Theme({
          id,
          name,
          description,
          createdDate: annotation.updated,
          annotationGuide/* PVSCL:IFCOND(GoogleSheetProvider and Hierarchy) */,
          multivalued,
          inductive/* PVSCL:ENDCOND *//* PVSCL:IFCOND(MoodleReport) */,
          moodleCriteriaId/* PVSCL:ENDCOND *//* PVSCL:IFCOND(TopicBased) */,
          isTopic/* PVSCL:ENDCOND */
        })
      } else {

      }
    } else {
      console.error('Unable to retrieve criteria from annotation')
    }
  }
  // PVSCL:IFCOND(CodebookUpdate, LINE) // Check if it is possible to add codes to the definition model if it is not selected Dynamic feature
  // PVSCL:IFCOND(Hierarchy, LINE)

  addCode (code) {
    this.codes.push(code)
    // Re-set colors for each code
    this.reloadColorsForCodes()
  }

  updateCode (code, previousId) {
    if (LanguageUtils.isInstanceOf(code, Code)) {
      // Find item index using _.findIndex
      let index = _.findIndex(this.codes, (it) => {
        return it.id === code.id || it.id === previousId
      })
      let previousCode = this.codes[index]
      code.color = previousCode.color
      // Replace item at index using native splice
      this.codes.splice(index, 1, code)
    }
  }

  removeCode (code) {
    _.remove(this.codes, code)
    // Re-set colors for each code
    this.reloadColorsForCodes()
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(CodebookUpdate, LINE)

  reloadColorsForCodes () {
    this.codes.forEach((code, j) => {
      let alphaForChild = (Config.colors.maxAlpha - Config.colors.minAlpha) / this.codes.length * (j + 1) + Config.colors.minAlpha
      code.color = ColorUtils.setAlphaToColor(this.color, alphaForChild)
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(ExportCodebook, LINE)

  toObjects () {
    let object = {
      name: this.name,
      description: this.description
    }
    // PVSCL:IFCOND(Hierarchy, LINE)
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
  // PVSCL:ENDCOND

  // PVSCL:IFCOND(MoodleProvider or ExportCodebook, LINE)
  static createThemeFromObject (theme, rubric) {
    theme.annotationGuide = rubric
    // Instance theme object
    let instancedTheme = Object.assign(new Theme(theme))
    // PVSCL:IFCOND(Hierarchy, LINE)
    // Instance codes
    for (let i = 0; i < theme.codes.length; i++) {
      instancedTheme.codes[i] = Code.createCodeFromObject(theme.codes[i], instancedTheme)
    }
    // PVSCL:ENDCOND
    return instancedTheme
  }
  // PVSCL:ENDCOND

  toObject () {
    return {
      name: this.name,
      description: this.description,
      id: this.id/* PVSCL:IFCOND(TopicBased) */,
      isTopic: this.isTopic/* PVSCL:ENDCOND */
    }
  }

  getTags () {
    return [Config.namespace + ':' + Config.tags.grouped.group + ':' + this.name]
  }

  // PVSCL:IFCOND(Hierarchy, LINE)
  getCodeByName (name) {
    if (_.isString(name)) {
      return this.codes.find(code => code.name === name)
    } else {
      return null
    }
  }
  // PVSCL:ENDCOND
}

module.exports = Theme
