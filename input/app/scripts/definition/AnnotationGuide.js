const jsYaml = require('js-yaml')
const Theme = require('./Theme')
// PVSCL:IFCOND(Code,LINE)
const Code = require('./Code')
// PVSCL:ENDCOND
const _ = require('lodash')
const LanguageUtils = require('../utils/LanguageUtils')

class AnnotationGuide {
  constructor ({id = null, name = '', storage = null, moodleEndpoint = null, assignmentId = null, courseId = null, spreadsheetId = null, sheetId = null}) {
    this.id = id
    this.name = name
    this.themes = []
    this.storage = storage
    this.moodleEndpoint = moodleEndpoint
    this.assignmentId = assignmentId
    this.courseId = courseId
    this.cmid = null
    this.spreadsheetId = spreadsheetId
    this.sheetId = sheetId
  }

  toAnnotation () {
    return {
      name: this.name,
      group: this.storage.group.id,
      permissions: {
        read: ['group:' + this.storage.group.id]
      },
      references: [],
      motivation: 'defining',
      tags: ['motivation:defining', 'oa:guide', 'exam:cmid:' + this.cmid],
      target: [],
      text: jsYaml.dump({
        moodleEndpoint: this.moodleEndpoint,
        assignmentId: this.assignmentId,
        courseId: this.courseId,
        spreadsheetId: this.spreadsheetId,
        sheetId: this.sheetId
      }),
      uri: this.storage.group.links.html
    }
  }

  toAnnotations () {
    let annotations = []
    // Create annotation for current element
    annotations.push(this.toAnnotation())
    // Create annotations for all criterias
    for (let i = 0; i < this.themes.length; i++) {
      annotations = annotations.concat(this.themes[i].toAnnotations())
    }
    return annotations
  }

  static fromAnnotation (annotation) {
    // TODO Xabi
    let config = jsYaml.load(annotation.text)
    // let cmidTag = _.find(annotation.tags, (tag) => {
    //   return tag.includes('exam:cmid:')
    // })
    // if (_.isString(cmidTag)) {
    //   config.cmid = cmidTag.replace('exam:cmid:', '')
    // }
    // config.assignmentName = config.assignmentName || window.abwa.groupSelector.currentGroup.name
    // config.hypothesisGroup = window.abwa.groupSelector.currentGroup
    return new AnnotationGuide({id: annotation.id, name: annotation.name, storage: annotation.group})
  }

  static fromAnnotations (annotations) {
    // TODO Xabi: return AnnotationGuide
    let guideAnnotation = _.remove(annotations, (annotation) => {
      return _.some(annotation.tags, (tag) => { return tag === 'oa:guide' })
    })
    let guide = AnnotationGuide.fromAnnotation(guideAnnotation[0])
    // TODO Complete the guide from the annotations
    // For the rest of annotations, get criterias and levels
    let themeAnnotations = _.remove(annotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes('oa:theme:')
      })
    })
    // PVSCL:IFCOND(Code,LINE)
    let codeAnnotations = _.remove(annotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes('oa:code:')
      })
    })
    // PVSCL:ENDCOND
    for (let i = 0; i < themeAnnotations.length; i++) {
      let theme = Theme.fromAnnotation(themeAnnotations[i], guide)
      if (LanguageUtils.isInstanceOf(theme, Theme)) {
        guide.themes.push(theme)
      }
    }
    // PVSCL:IFCOND(Code,LINE)
    // Order criterias by criteria id
    // guide.themes = _.orderBy(guide.themes, ['criteriaId'])
    for (let i = 0; i < codeAnnotations.length; i++) {
      let codeAnnotation = codeAnnotations[i]
      // Get theme corresponding to the level
      let themeTag = _.find(codeAnnotation.tags, (tag) => {
        return tag.includes('oa:isCodeOf:')
      })
      let themeName = themeTag.replace('oa:isCodeOf:', '')
      let theme = _.find(guide.themes, (theme) => {
        return theme.name === themeName
      })
      let code = Code.fromAnnotation(codeAnnotation, theme)
      theme.codes.push(code)
    }
    // PVSCL:ENDCOND
    return guide
  }

  static fromUserDefinedHighlighterDefinition (userDefinedHighlighterDefinition) {
    let annotationGuide = new AnnotationGuide({name: userDefinedHighlighterDefinition.name})
    for (let i = 0; i < userDefinedHighlighterDefinition.definition.length; i++) {
      let themeDefinition = userDefinedHighlighterDefinition.definition[i]
      let theme = new Theme({name: themeDefinition.name, description: themeDefinition.description, annotationGuide})
      // PVSCL:IFCOND(Code,LINE)
      theme.codes = []
      if (_.isArray(themeDefinition.codes)) {
        for (let j = 0; j < themeDefinition.codes.length; j++) {
          let codeDefinition = themeDefinition.codes[j]
          let code = new Code({name: codeDefinition.name, description: codeDefinition.description, theme: theme})
          theme.codes.push(code)
        }
      }
      // PVSCL:ENDCOND
      annotationGuide.themes.push(theme)
    }
    return annotationGuide
  }

  static fromMoodle (moodleDataModel) {

  }

  getCodeOrThemeFromId (id) {
    let theme = _.find(this.themes, (theme) => {
      return theme.id === id
    })
    // PVSCL:IFCOND(Code,LINE)
    if (!LanguageUtils.isInstanceOf(theme, Theme)) {
      // Look for code inside themes
      for (let i = 0; i < this.themes.length; i++) {
        let theme = this.themes[i]
        let code = _.find(theme.codes, (code) => {
          return code.id === id
        })
        if (LanguageUtils.isInstanceOf(code, Code)) {
          return code
        }
      }
      return null
    } else {
      return theme
    }
    // PVSCL:ELSECOND
    return theme
    // PVSCL:ENDCOND
  }
}

module.exports = AnnotationGuide
