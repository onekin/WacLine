import jsYaml from 'js-yaml'
import Theme from './Theme'
import Config from '../../Config'
import _ from 'lodash'
import LanguageUtils from '../../utils/LanguageUtils'
// PVSCL:IFCOND(Hierarchy,LINE)
import Code from './Code'
// PVSCL:ENDCOND
// PVSCL:IFCOND(Hypothesis, LINE)
import Hypothesis from '../../annotationServer/hypothesis/Hypothesis'
// PVSCL:ENDCOND
// PVSCL:IFCOND(BrowserStorage, LINE)
import BrowserStorage from '../../annotationServer/browserStorage/BrowserStorage'
// PVSCL:ENDCOND
// PVSCL:IFCOND(CodebookUpdate, LINE)
import ColorUtils from '../../utils/ColorUtils'
// PVSCL:ENDCOND

class Codebook {
  constructor ({
    id = null,
    name = '',
    annotationServer = null/* PVSCL:IFCOND(MoodleProvider or MoodleReport or MoodleResource) */,
    moodleEndpoint = null,
    assignmentName = null,
    assignmentId = null,
    courseId = null,
    cmid = null/* PVSCL:ENDCOND *//* PVSCL:IFCOND(GoogleSheetProvider) */,
    spreadsheetId = null,
    sheetId = null/* PVSCL:ENDCOND */
  }) {
    this.id = id
    this.name = name
    this.themes = []
    this.annotationServer = annotationServer
    // PVSCL:IFCOND(MoodleProvider,LINE)
    this.moodleEndpoint = moodleEndpoint
    this.assignmentName = assignmentName
    this.assignmentId = assignmentId
    this.courseId = courseId
    this.cmid = cmid
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(GoogleSheetProvider,LINE)
    this.spreadsheetId = spreadsheetId
    this.sheetId = sheetId
    // PVSCL:ENDCOND
  }

  toAnnotation () {
    const motivationTag = 'motivation:defining'
    const guideTag = Config.namespace + ':guide'
    const tags = [motivationTag, guideTag]
    // PVSCL:IFCOND(MoodleProvider or MoodleReport or MoodleResource,LINE)
    const cmidTag = 'cmid:' + this.cmid
    tags.push(cmidTag)
    // PVSCL:ENDCOND
    // Construct text attribute of the annotation
    let textObject
    // PVSCL:IFCOND(MoodleProvider or MoodleReport or MoodleResource,LINE)
    textObject = {
      moodleEndpoint: this.moodleEndpoint,
      assignmentId: this.assignmentId,
      assignmentName: this.assignmentName,
      courseId: this.courseId,
      cmid: this.cmid
    }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(GoogleSheetProvider,LINE)
    textObject = {
      spreadsheetId: this.spreadsheetId,
      sheetId: this.sheetId
    }
    // PVSCL:ENDCOND
    // Return the constructed annotation
    return {
      name: this.name,
      group: this.annotationServer.getGroupId(),
      permissions: {
        read: ['group:' + this.annotationServer.getGroupId()]
      },
      references: [],
      motivation: 'defining',
      tags: tags,
      target: [],
      text: jsYaml.dump(textObject),
      uri: this.annotationServer.getGroupUrl()
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

  static fromAnnotation (annotation, callback) {
    this.setAnnotationServer(annotation.group || null, (annotationServer) => {
      const annotationGuideOpts = { id: annotation.id, name: annotation.name, annotationServer: annotationServer }
      // PVSCL:IFCOND(GoogleSheetProvider or MoodleProvider, LINE)
      // Configuration for gsheet provider or moodle provider is saved in text attribute
      // TODO Maybe this is not the best place to store this configuration, it wa done in this way to be visible in Hypothes.is client, but probably it should be defined in the body of the annotation
      const config = jsYaml.load(annotation.text)
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(GoogleSheetProvider, LINE)
      annotationGuideOpts.spreadsheetId = config.spreadsheetId
      annotationGuideOpts.sheetId = config.sheetId
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(MoodleProvider, LINE)
      annotationGuideOpts.moodleEndpoint = config.moodleEndpoint
      annotationGuideOpts.assignmentId = config.assignmentId
      annotationGuideOpts.assignmentName = config.assignmentName
      annotationGuideOpts.courseId = config.courseId
      const cmidTag = _.find(annotation.tags, (tag) => {
        return tag.includes('cmid:')
      })
      if (_.isString(cmidTag)) {
        annotationGuideOpts.cmid = cmidTag.replace('cmid:', '')
      }
      // PVSCL:ENDCOND
      let guide
      guide = new Codebook(annotationGuideOpts)
      if (_.isFunction(callback)) {
        callback(guide)
      }
    })
  }

  static fromAnnotations (annotations, callback) {
    // return Codebook
    const guideAnnotation = _.remove(annotations, (annotation) => {
      return _.some(annotation.tags, (tag) => { return tag === Config.namespace + ':guide' })
    })
    if (guideAnnotation.length > 0) {
      Codebook.fromAnnotation(guideAnnotation[0], (guide) => {
        // TODO Complete the guide from the annotations
        // For the rest of annotations, get themes and codes
        const themeAnnotations = _.remove(annotations, (annotation) => {
          return _.some(annotation.tags, (tag) => {
            return tag.includes(Config.namespace + ':' + Config.tags.grouped.group + ':')
          })
        })
        // PVSCL:IFCOND(Hierarchy,LINE)
        const codeAnnotations = _.remove(annotations, (annotation) => {
          return _.some(annotation.tags, (tag) => {
            return tag.includes(Config.namespace + ':' + Config.tags.grouped.subgroup + ':')
          })
        })
        // PVSCL:ENDCOND
        for (let i = 0; i < themeAnnotations.length; i++) {
          const theme = Theme.fromAnnotation(themeAnnotations[i], guide)
          if (LanguageUtils.isInstanceOf(theme, Theme)) {
            guide.themes.push(theme)
          }
        }
        // PVSCL:IFCOND(Hierarchy,LINE)
        for (let i = 0; i < codeAnnotations.length; i++) {
          const codeAnnotation = codeAnnotations[i]
          // Get theme corresponding to the level
          const themeTag = _.find(codeAnnotation.tags, (tag) => {
            return tag.includes(Config.namespace + ':' + Config.tags.grouped.relation + ':')
          })
          const themeName = themeTag.replace(Config.namespace + ':' + Config.tags.grouped.relation + ':', '')
          const theme = _.find(guide.themes, (theme) => {
            return theme.name === themeName
          })
          const code = Code.fromAnnotation(codeAnnotation, theme)
          if (LanguageUtils.isInstanceOf(theme, Theme)) {
            theme.codes.push(code)
          } else {
            console.debug('Code %s has no theme', code.name)
          }
        }
        // PVSCL:ENDCOND
        if (_.isFunction(callback)) {
          callback(null, guide)
        }
      })
    } else {
      callback(new Error('No annotations for codebook defined'))
    }
  }

  static setAnnotationServer (newGroupId, callback) {
    let annotationServerInstance
    let group
    if (_.has(window.abwa, 'groupSelector')) {
      if (newGroupId === null) {
        group = window.abwa.groupSelector.currentGroup
      } else {
        group = window.abwa.groupSelector.groups.find((element) => {
          return element.id === newGroupId
        })
      }
    } else {
      group = { id: newGroupId } // Faking group object only with ID property, currently this is the only property used, but in case in any future feature is required to be used with more, this line must be taken into account for further modification
    }
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Size()>1,LINE)
    chrome.runtime.sendMessage({ scope: 'annotationServer', cmd: 'getSelectedAnnotationServer' }, ({ annotationServer }) => {
      if (annotationServer === 'hypothesis') {
        // Hypothesis
        annotationServerInstance = new Hypothesis({ group: group })
      } else {
        // Browser storage
        annotationServerInstance = new BrowserStorage({ group: group })
      }
      if (_.isFunction(callback)) {
        callback(annotationServerInstance)
      }
    })
    // PVSCL:ELSECOND
    // PVSCL:IFCOND(Hypothesis,LINE)
    annotationServerInstance = new Hypothesis({ group: group })
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage,LINE)
    annotationServerInstance = new BrowserStorage({ group: group })
    // PVSCL:ENDCOND
    if (_.isFunction(callback)) {
      callback(annotationServerInstance)
    }
    // PVSCL:ENDCOND
  }
  // PVSCL:IFCOND(BuiltIn or ImportCodebook or NOT(Codebook) or ImportAnnotations, LINE)

  static fromObjects (userDefinedHighlighterDefinition) {
    const annotationGuide = new Codebook({ name: userDefinedHighlighterDefinition.name })
    for (let i = 0; i < userDefinedHighlighterDefinition.definition.length; i++) {
      const themeDefinition = userDefinedHighlighterDefinition.definition[i]
      const theme = new Theme({ name: themeDefinition.name, description: themeDefinition.description, annotationGuide })
      // PVSCL:IFCOND(Hierarchy,LINE)
      theme.codes = []
      if (_.isArray(themeDefinition.codes)) {
        for (let j = 0; j < themeDefinition.codes.length; j++) {
          const codeDefinition = themeDefinition.codes[j]
          const code = new Code({ name: codeDefinition.name, description: codeDefinition.description, theme: theme })
          theme.codes.push(code)
        }
      }
      // PVSCL:ENDCOND
      annotationGuide.themes.push(theme)
    }
    return annotationGuide
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(GoogleSheetProvider,LINE)

  static fromGoogleSheet ({ spreadsheetId, sheetId, spreadsheet, sheetName }) {
    const codebook = new Codebook({ spreadsheetId, sheetId, name: sheetName })
    codebook.themes = Codebook.getThemesAndCodesGSheet(spreadsheet, codebook)
    return codebook
  }

  static getThemesAndCodesGSheet (spreadsheet, annotationGuide) {
    // Find current sheet
    const sheet = _.find(spreadsheet.sheets, (sheet) => { return sheet.properties.sheetId === annotationGuide.sheetId })
    // Check if exists object
    if (sheet && sheet.data && sheet.data[0] && sheet.data[0].rowData && sheet.data[0].rowData[0] && sheet.data[0].rowData[0].values) {
      // Retrieve index of "Author" column
      let lastIndex = _.findIndex(sheet.data[0].rowData[0].values, (cell) => {
        if (cell && cell.formattedValue) {
          return cell.formattedValue === ''
        } else {
          return false
        }
      })
      if (lastIndex === -1) {
        lastIndex = sheet.data[0].rowData[0].values.length
      }
      // If index of author exists
      if (lastIndex > 0) {
        // Retrieve themes. Retrieve elements between 2 column and author column, maps "formattedValue"
        const themesArray = _.map(_.slice(sheet.data[0].rowData[0].values, 1, lastIndex), 'formattedValue')
        const themes = _.map(_.countBy(themesArray), (numberOfColumns, name) => {
          const theme = new Theme({ name: name, annotationGuide })
          // PVSCL:IFCOND(Hierarchy,LINE)
          theme.multivalued = numberOfColumns > 1
          // PVSCL:ENDCOND
          return theme
        })
        // If facets are found, try to find codes for each
        if (themesArray.length > 0) {
        // PVSCL:IFCOND(Hierarchy,LINE)
          // Find codes
          if (sheet.data[0].rowData[1] && sheet.data[0].rowData[1].values) {
            // Get cells for codes
            const values = _.slice(sheet.data[0].rowData[1].values, 1, lastIndex)
            // For each cell
            for (let i = 0; i < themesArray.length; i++) {
              // Retrieve its facet
              const currentThemeName = themesArray[i]
              // If theme of current row is text and is a facet and is not already set the possible codes
              const currentTheme = _.find(themes, (facet) => { return facet.name === currentThemeName })
              if (_.isString(currentThemeName) && currentTheme && currentTheme.codes.length === 0) {
                // If cell has data validation "ONE_OF_LIST"
                if (_.isObject(values[i]) && _.isObject(values[i].dataValidation) && values[i].dataValidation.condition.type === 'ONE_OF_LIST') {
                  currentTheme.inductive = false
                  currentTheme.codes = _.map(values[i].dataValidation.condition.values, (value) => { return new Code({ name: value.userEnteredValue, theme: currentTheme }) })
                } else { // If cell has not data validation
                  currentTheme.inductive = true
                }
              }
            }
          }
          // PVSCL:ENDCOND
          return themes
        } else {
          return new Error('The spreadsheet hasn\'t the correct structure, you have not defined any facet.')
        }
      } else {
        return new Error('The spreadsheet\'s first row is empty.')
      }
    } else {
      return new Error('The spreadsheet hasn\'t the correct structure. The ROW #1 must contain the themes for your codebook.')
    }
  }
  // PVSCL:ENDCOND

  getCodeOrThemeFromId (id) {
    let themeOrCodeToReturn = null
    const theme = _.find(this.themes, (theme) => {
      return theme.id === id
    })
    if (LanguageUtils.isInstanceOf(theme, Theme)) {
      themeOrCodeToReturn = theme
    } /* PVSCL:IFCOND(Hierarchy) */ else {
      // Look for code inside themes
      for (let i = 0; i < this.themes.length; i++) {
        const theme = this.themes[i]
        const code = _.find(theme.codes, (code) => {
          return code.id === id
        })
        if (LanguageUtils.isInstanceOf(code, Code)) {
          themeOrCodeToReturn = code
        }
      }
    } /* PVSCL:ENDCOND */
    return themeOrCodeToReturn
  }
  // PVSCL:IFCOND(CodebookUpdate, LINE)

  addTheme (theme) {
    if (LanguageUtils.isInstanceOf(theme, Theme)) {
      this.themes.push(theme)
      // Get new color for the theme
      const colors = ColorUtils.getDifferentColors(this.themes.length)
      const lastColor = colors.pop()
      theme.color = ColorUtils.setAlphaToColor(lastColor, Config.colors.minAlpha)
    }
  }

  updateTheme (theme, previousId) {
    if (LanguageUtils.isInstanceOf(theme, Theme)) {
      // Find item index using _.findIndex
      const index = _.findIndex(this.themes, (it) => {
        return it.id === theme.id || it.id === previousId
      })
      const previousTheme = this.themes[index]
      // Replace item at index using native splice
      this.themes.splice(index, 1, theme)
      theme.color = previousTheme.color
    }
  }

  removeTheme (theme) {
    _.remove(this.themes, theme)
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(MoodleProvider, LINE)

  static createCodebookFromObject (rubric) {
    // Instance rubric object
    const instancedCodebook = Object.assign(new Codebook(rubric))
    // Instance themes and codes
    for (let i = 0; i < rubric.themes.length; i++) {
      instancedCodebook.themes[i] = Theme.createThemeFromObject(rubric.themes[i], instancedCodebook)
    }
    return instancedCodebook
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(ExportCodebook or Export, LINE)

  toObjects (name) {
    const object = {
      name: name,
      definition: []
    }
    // For each criteria create the object
    for (let i = 0; i < this.themes.length; i++) {
      const theme = this.themes[i]
      if (LanguageUtils.isInstanceOf(theme, Theme)) {
        object.definition.push(theme.toObjects())
      }
    }
    return object
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(PreviousAssignments, LINE)

  getUrlToStudentAssignmentForTeacher (studentId) {
    if (studentId && this.moodleEndpoint && this.cmid) {
      return this.moodleEndpoint + 'mod/assign/view.php?id=' + this.cmid + '&rownum=0&action=grader&userid=' + studentId
    } else {
      return null
    }
  }

  getUrlToStudentAssignmentForStudent (studentId) {
    if (studentId && this.moodleEndpoint && this.cmid) {
      return this.moodleEndpoint + 'mod/assign/view.php?id=' + this.cmid
    } else {
      return null
    }
  }
  // PVSCL:ENDCOND

  getThemeByName (name) {
    if (_.isString(name)) {
      return this.themes.find(theme => theme.name === name)
    } else {
      return null
    }
  }

  static codebookAnnotationsAreEqual (anno1, anno2) {
    return anno1.group === anno2.group &&
      anno1.motivation === anno2.motivation &&
      _.isEmpty(_.difference(anno1.tags, anno2.tags)) &&
      anno1.text === anno2.text &&
      anno1.uri === anno2.uri
  }
}

export default Codebook
