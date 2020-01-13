const jsYaml = require('js-yaml')
const Theme = require('./Theme')
const Config = require('../Config')
const _ = require('lodash')
const LanguageUtils = require('../utils/LanguageUtils')
// PVSCL:IFCOND(Code,LINE)
const Code = require('./Code')
// PVSCL:ENDCOND
// PVSCL:IFCOND(GSheetProvider,LINE)
const URLUtils = require('../utils/URLUtils')
const Alerts = require('../utils/Alerts')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Hypothesis, LINE)
const Hypothesis = require('../storage/hypothesis/Hypothesis')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Local, LINE)
const Local = require('../storage/local/Local')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Dynamic, LINE)
const ColorUtils = require('../utils/ColorUtils')
// PVSCL:ENDCOND

class AnnotationGuide {
  constructor ({
    id = null,
    name = '',
    storage = null/* PVSCL:IFCOND(MoodleProvider or MoodleReport or MoodleURL) */,
    moodleEndpoint = null,
    assignmentName = null,
    assignmentId = null,
    courseId = null,
    cmid = null/* PVSCL:ENDCOND *//* PVSCL:IFCOND(GSheetProvider) */,
    spreadsheetId = null,
    sheetId = null/* PVSCL:ENDCOND */
  }) {
    this.id = id
    this.name = name
    this.themes = []
    this.storage = storage
    // PVSCL:IFCOND(MoodleProvider,LINE)
    this.moodleEndpoint = moodleEndpoint
    this.assignmentName = assignmentName
    this.assignmentId = assignmentId
    this.courseId = courseId
    this.cmid = cmid
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(GSheetProvider,LINE)
    this.spreadsheetId = spreadsheetId
    this.sheetId = sheetId
    // PVSCL:ENDCOND
  }

  toAnnotation () {
    let motivationTag = 'motivation:defining'
    let guideTag = Config.namespace + ':guide'
    let tags = [motivationTag, guideTag]
    // PVSCL:IFCOND(MoodleProvider or MoodleReport or MoodleURL,LINE)
    let cmidTag = 'cmid:' + this.cmid
    tags.push(cmidTag)
    // PVSCL:ENDCOND
    // Construct text attribute of the annotation
    let textObject = {}
    // PVSCL:IFCOND(MoodleProvider or MoodleReport or MoodleURL,LINE)
    textObject = {
      moodleEndpoint: this.moodleEndpoint,
      assignmentId: this.assignmentId,
      assignmentName: this.assignmentName,
      courseId: this.courseId,
      cmid: this.cmid
    }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(GSheetProvider,LINE)
    textObject = {
      spreadsheetId: this.spreadsheetId,
      sheetId: this.sheetId
    }
    // PVSCL:ENDCOND
    // Return the constructed annotation
    return {
      name: this.name,
      group: this.storage.group.id,
      permissions: {
        read: ['group:' + this.storage.group.id]
      },
      references: [],
      motivation: 'defining',
      tags: tags,
      target: [],
      text: jsYaml.dump(textObject),
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

  static fromAnnotation (annotation, callback) {
    this.setStorage(null, (storage) => {
      let annotationGuideOpts = {id: annotation.id, name: annotation.name, storage: storage}
      // PVSCL:IFCOND(GSheetProvider or MoodleProvider, LINE)
      // Configuration for gsheet provider or moodle provider is saved in text attribute
      // TODO Maybe this is not the best place to store this configuration, it wa done in this way to be visible in Hypothes.is client, but probably it should be defined in the body of the annotation
      let config = jsYaml.load(annotation.text)
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(GSheetProvider, LINE)
      annotationGuideOpts['spreadsheetId'] = config.spreadsheetId
      annotationGuideOpts['sheetId'] = config.sheetId
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(MoodleProvider, LINE)
      annotationGuideOpts['moodleEndpoint'] = config.moodleEndpoint
      annotationGuideOpts['assignmentId'] = config.assignmentId
      annotationGuideOpts['assignmentName'] = config.assignmentName
      annotationGuideOpts['courseId'] = config.courseId
      let cmidTag = _.find(annotation.tags, (tag) => {
        return tag.includes('cmid:')
      })
      if (_.isString(cmidTag)) {
        annotationGuideOpts['cmid'] = cmidTag.replace('cmid:', '')
      }
      // PVSCL:ENDCOND
      let guide
      guide = new AnnotationGuide(annotationGuideOpts)
      if (_.isFunction(callback)) {
        callback(guide)
      }
    })
  }

  static fromAnnotations (annotations, callback) {
    // return AnnotationGuide
    let guideAnnotation = _.remove(annotations, (annotation) => {
      return _.some(annotation.tags, (tag) => { return tag === Config.namespace + ':guide' })
    })
    if (guideAnnotation.length > 0) {
      AnnotationGuide.fromAnnotation(guideAnnotation[0], (guide) => {
        // TODO Complete the guide from the annotations
        // For the rest of annotations, get themes and codes
        let themeAnnotations = _.remove(annotations, (annotation) => {
          return _.some(annotation.tags, (tag) => {
            return tag.includes(Config.namespace + ':' + Config.tags.grouped.group + ':')
          })
        })
        // PVSCL:IFCOND(Code,LINE)
        let codeAnnotations = _.remove(annotations, (annotation) => {
          return _.some(annotation.tags, (tag) => {
            return tag.includes(Config.namespace + ':' + Config.tags.grouped.subgroup + ':')
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
        for (let i = 0; i < codeAnnotations.length; i++) {
          let codeAnnotation = codeAnnotations[i]
          // Get theme corresponding to the level
          let themeTag = _.find(codeAnnotation.tags, (tag) => {
            return tag.includes(Config.namespace + ':' + Config.tags.grouped.relation + ':')
          })
          let themeName = themeTag.replace(Config.namespace + ':' + Config.tags.grouped.relation + ':', '')
          let theme = _.find(guide.themes, (theme) => {
            return theme.name === themeName
          })
          let code = Code.fromAnnotation(codeAnnotation, theme)
          if (LanguageUtils.isInstanceOf(theme, Theme)) {
            theme.codes.push(code)
          } else {
            console.debug('Code %s has no theme', code.name)
          }
        }
        // PVSCL:ENDCOND
        callback(guide)
      })
    } else {
      callback(null)
    }
  }

  static setStorage (newGroup, callback) {
    let annotationStorage
    let group
    if (newGroup === null) {
      group = window.abwa.groupSelector.currentGroup
    } else {
      group = newGroup
    }
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren()->pv:Size()>1,LINE)
    chrome.runtime.sendMessage({scope: 'storage', cmd: 'getSelectedStorage'}, ({storage}) => {
      if (storage === 'hypothesis') {
        // Hypothesis
        annotationStorage = new Hypothesis({group: group})
      } else {
        // Local storage
        annotationStorage = new Local({group: group})
      }
      if (_.isFunction(callback)) {
        callback(annotationStorage)
      }
    })
    // PVSCL:ELSECOND
    // PVSCL:IFCOND(Hypothesis,LINE)
    annotationStorage = new Hypothesis({group: group})
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Local,LINE)
    annotationStorage = new Local({group: group})
    // PVSCL:ENDCOND
    if (_.isFunction(callback)) {
      callback(annotationStorage)
    }
    // PVSCL:ENDCOND
  }
  // PVSCL:IFCOND(User or ImportGroup,LINE)

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
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(GSheetProvider,LINE)

  static fromGSheetProvider (callback) {
    let annotationGuide = new AnnotationGuide({})
    annotationGuide.spreadsheetId = this.retrieveSpreadsheetId()
    annotationGuide.sheetId = this.retrieveSheetId()
    this.retrieveCurrentToken((err, token) => {
      if (err) {
        callback(err)
      } else {
        this.getSpreadsheet(annotationGuide, token, (err, spreadsheet) => {
          if (err) {
            callback(err)
          } else {
            // Retrieve spreadsheet title
            // PVSCL:IFCOND(Manual,LINE)
            annotationGuide.name = spreadsheet.properties.title
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(ApplicationBased,LINE)
            annotationGuide.name = Config.groupName
            // PVSCL:ENDCOND
            let themes = this.getThemesAndCodesGSheet(spreadsheet, annotationGuide)
            if (_.isError(themes)) {
              callback(err)
            } else {
              annotationGuide.themes = themes
              if (_.isFunction(callback)) {
                callback(null, annotationGuide)
              }
            }
          }
        })
      }
    })
  }

  static retrieveSpreadsheetId () {
    // Get current google sheet id
    this.spreadsheetId = window.location.href.match(/[-\w]{25,}/)[0]
    return window.location.href.match(/[-\w]{25,}/)[0]
  }

  static retrieveSheetId () {
    let hashParams = URLUtils.extractHashParamsFromUrl(window.location.href, '=')
    return parseInt(hashParams.gid)
  }

  static retrieveCurrentToken (callback) {
    chrome.runtime.sendMessage({scope: 'googleSheets', cmd: 'getToken'}, (result) => {
      if (_.isFunction(callback)) {
        if (result.token) {
          callback(null, result.token)
        } else {
          callback(result.error)
        }
      }
    })
  }

  static getSpreadsheet (annotationGuide, token, callback) {
    chrome.runtime.sendMessage({
      scope: 'googleSheets',
      cmd: 'getSpreadsheet',
      data: JSON.stringify({
        spreadsheetId: annotationGuide.spreadsheetId
      })
    }, (response) => {
      if (response.error) {
        Alerts.errorAlert({
          text: 'You don\'t have permission to access the spreadsheet! Are you using the same Google account for the spreadsheet and for Google Chrome?<br/>If you don\'t know how to solve this problem: Please create on top right: "Share -> Get shareable link", and give edit permission.' // TODO i18n
        })
        callback(new Error('Unable to retrieve spreadsheet data. Permission denied.'))
      } else {
        try {
          let spreadsheet = JSON.parse(response.spreadsheet)
          callback(null, spreadsheet)
        } catch (e) {
          callback(e)
        }
      }
    })
  }

  static getThemesAndCodesGSheet (spreadsheet, annotationGuide) {
    // Find current sheet
    let sheet = _.find(spreadsheet.sheets, (sheet) => { return sheet.properties.sheetId === annotationGuide.sheetId })
    // Check if exists object
    if (sheet && sheet.data && sheet.data[0] && sheet.data[0].rowData && sheet.data[0].rowData[0] && sheet.data[0].rowData[0].values) {
      // Retrieve index of "Author" column
      let indexOfAuthor = _.findIndex(sheet.data[0].rowData[0].values, (cell) => {
        if (cell && cell.formattedValue) {
          return cell.formattedValue.toLowerCase() === 'author'
        } else {
          return false
        }
      })
      // If index of author exists
      if (indexOfAuthor !== -1) {
        // Retrieve themes. Retrieve elements between 2 column and author column, maps "formattedValue"
        let themesArray = _.map(_.slice(sheet.data[0].rowData[0].values, 1, indexOfAuthor), 'formattedValue')
        let themes = _.map(_.countBy(themesArray), (numberOfColumns, name) => {
          let theme = new Theme({name: name, annotationGuide})
          // PVSCL:IFCOND(Code,LINE)
          theme.multivalued = numberOfColumns > 1
          // PVSCL:ENDCOND
          return theme
        })
        // If facets are found, try to find codes for each
        if (themesArray.length > 0) {
        // PVSCL:IFCOND(Code,LINE)
          // Find codes
          if (sheet.data[0].rowData[1] && sheet.data[0].rowData[1].values) {
            // Get cells for codes
            let values = _.slice(sheet.data[0].rowData[1].values, 1, indexOfAuthor)
            // For each cell
            for (let i = 0; i < themesArray.length; i++) {
              // Retrieve its facet
              let currentThemeName = themesArray[i]
              // If theme of current row is text and is a facet and is not already set the possible codes
              let currentTheme = _.find(themes, (facet) => { return facet.name === currentThemeName })
              if (_.isString(currentThemeName) && currentTheme && currentTheme.codes.length === 0) {
                // If cell has data validation "ONE_OF_LIST"
                if (_.isObject(values[i]) && _.isObject(values[i].dataValidation) && values[i].dataValidation.condition.type === 'ONE_OF_LIST') {
                  currentTheme.inductive = false
                  currentTheme.codes = _.map(values[i].dataValidation.condition.values, (value) => { return new Code({name: value.userEnteredValue, theme: currentTheme}) })
                } else { // If cell has not data validation
                  currentTheme.inductive = true
                }
              }
            }
          }
          // PVSCL:ENDCOND
          return themes
        } else {
          Alerts.errorAlert('The spreadsheet hasn\'t the correct structure, you have not defined any facet.')
          return new Error('No theme defined')
        }
      } else {
        Alerts.errorAlert('The spreadsheet hasn\'t the correct structure, "author" column is missing.')
        return new Error('No author found')
      }
    } else {
      Alerts.errorAlert('The spreadsheet hasn\'t the correct structure. The ROW #1 must contain the facets names for your review.')
      return new Error('Row 1 theme names')
    }
  }
  // PVSCL:ENDCOND

  getCodeOrThemeFromId (id) {
    let themeOrCodeToReturn = null
    let theme = _.find(this.themes, (theme) => {
      return theme.id === id
    })
    if (LanguageUtils.isInstanceOf(theme, Theme)) {
      themeOrCodeToReturn = theme
    } /* PVSCL:IFCOND(Code) */ else {
      // Look for code inside themes
      for (let i = 0; i < this.themes.length; i++) {
        let theme = this.themes[i]
        let code = _.find(theme.codes, (code) => {
          return code.id === id
        })
        if (LanguageUtils.isInstanceOf(code, Code)) {
          themeOrCodeToReturn = code
        }
      }
    } /* PVSCL:ENDCOND */
    return themeOrCodeToReturn
  }
  // PVSCL:IFCOND(Dynamic, LINE)

  addTheme (theme) {
    if (LanguageUtils.isInstanceOf(theme, Theme)) {
      this.themes.push(theme)
      // Get new color for the theme
      let colors = ColorUtils.getDifferentColors(this.themes.length)
      let lastColor = colors.pop()
      theme.color = ColorUtils.setAlphaToColor(lastColor, Config.colors.minAlpha)
    }
  }

  removeTheme (theme) {
    _.remove(this.themes, theme)
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(MoodleProvider, LINE)

  static createAnnotationGuideFromObject (rubric) {
    // Instance rubric object
    let instancedAnnotationGuide = Object.assign(new AnnotationGuide(rubric))
    // Instance themes and codes
    for (let i = 0; i < rubric.themes.length; i++) {
      instancedAnnotationGuide.themes[i] = Theme.createThemeFromObject(rubric.themes[i], instancedAnnotationGuide)
    }
    return instancedAnnotationGuide
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(ExportGroup, LINE)

  toObject (name) {
    let object = {
      name: name,
      definition: []
    }
    // For each criteria create the object
    for (let i = 0; i < this.themes.length; i++) {
      let theme = this.themes[i]
      if (LanguageUtils.isInstanceOf(theme, Theme)) {
        object.definition.push(theme.toObject())
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
}

module.exports = AnnotationGuide
