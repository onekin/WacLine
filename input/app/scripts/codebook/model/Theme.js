import jsYaml from 'js-yaml'
import _ from 'lodash'
import Config from '../../Config'
// PVSCL:IFCOND(CodebookUpdate, LINE)
import ColorUtils from '../../utils/ColorUtils'
// PVSCL:ENDCOND
// PVSCL:IFCOND(Hierarchy, LINE)
import Code from './Code'
// PVSCL:ENDCOND
import LanguageUtils from '../../utils/LanguageUtils'

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
    moodleCriteriaId/* PVSCL:ENDCOND */
  }) {
    this.id = id
    this.name = name
    this.description = description
    this.color = color
    this.annotationGuide = annotationGuide
    if (LanguageUtils.isInstanceOf(createdDate, Date)) {
      this.createdDate = createdDate
    } else {
      const timestamp = Date.parse(createdDate)
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
    const themeTag = Config.namespace + ':' + Config.tags.grouped.group + ':' + this.name
    const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'codebookDevelopment'
    const tags = [themeTag, motivationTag]
    // PVSCL:IFCOND(MoodleProvider,LINE)
    const cmidTag = 'cmid:' + this.annotationGuide.cmid
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
      group: this.annotationGuide.annotationServer.getGroupId(),
      permissions: {
        read: ['group:' + this.annotationGuide.annotationServer.getGroupId()]
      },
      motivation: 'codebookDevelopment',
      references: [],
      tags: tags,
      target: [],
      text: jsYaml.dump({
        id: this.id || ''/* PVSCL:IFCOND(BuiltIn) */,
        description: this.description/* PVSCL:ENDCOND */
      }),
      uri: this.annotationGuide.annotationServer.getGroupUrl()
    }
  }

  static fromAnnotations () {
    // TODO Xabi
  }

  static fromAnnotation (annotation, annotationGuide = {}) {
    const themeTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':' + Config.tags.grouped.group + ':')
    })
    // PVSCL:IFCOND(GoogleSheetProvider and Hierarchy,LINE)
    const multivaluedTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':multivalued')
    })
    const inductiveTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':inductive')
    })
    // PVSCL:ENDCOND
    if (_.isString(themeTag)) {
      const name = themeTag.replace(Config.namespace + ':' + Config.tags.grouped.group + ':', '')
      const config = jsYaml.load(annotation.text)
      // PVSCL:IFCOND(GoogleSheetProvider and Hierarchy,LINE)
      // multivalued and inductive
      const multivalued = _.isString(multivaluedTag)
      const inductive = _.isString(inductiveTag)
      // PVSCL:ENDCOND
      if (_.isObject(config)) {
        const description = config.description
        const id = annotation.id
        // PVSCL:IFCOND(MoodleReport,LINE)
        const moodleCriteriaId = config.id
        // PVSCL:ENDCOND
        return new Theme({
          id,
          name,
          description,
          createdDate: annotation.updated,
          annotationGuide/* PVSCL:IFCOND(GoogleSheetProvider and Hierarchy) */,
          multivalued,
          inductive/* PVSCL:ENDCOND *//* PVSCL:IFCOND(MoodleReport) */,
          moodleCriteriaId/* PVSCL:ENDCOND */
        })
      } else {
        console.error('Unable to retrieve configuration for annotation')
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
      const index = _.findIndex(this.codes, (it) => {
        return it.id === code.id || it.id === previousId
      })
      const previousCode = this.codes[index]
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
      const alphaForChild = (Config.colors.maxAlpha - Config.colors.minAlpha) / this.codes.length * (j + 1) + Config.colors.minAlpha
      code.color = ColorUtils.setAlphaToColor(this.color, alphaForChild)
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(ExportCodebook, LINE)

  toObjects () {
    const object = {
      name: this.name,
      description: this.description
    }
    // PVSCL:IFCOND(Hierarchy, LINE)
    if (this.codes.length > 0) {
      object.codes = []
      // For each level
      for (let i = 0; i < this.codes.length; i++) {
        const code = this.codes[i]
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
    const instancedTheme = Object.assign(new Theme(theme))
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
      id: this.id
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

  maxCode () {
    try {
      if (_.every(this.codes.map(code => _.isNumber(parseFloat(code.name))))) { // All elements are numbers
        return _.maxBy(this.codes, (code) => { return parseFloat(code.name) })
      } else {
        return null
      }
    } catch (e) {
      return null
    }
  }
}

export default Theme
