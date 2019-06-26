const Alerts = require('../../utils/Alerts')
const AnnotationUtils = require('../../utils/AnnotationUtils')
const LanguageUtils = require('../../utils/LanguageUtils')
const _ = require('lodash')
const Theme = require('../../definition/Theme')

const HyperSheetColors = {
  red: {
    'red': 0.8980392,
    'green': 0.49803922,
    'blue': 0.49803922
  },
  white: {
    'red': 1,
    'green': 1,
    'blue': 1
  },
  yellow: {
    'red': 1,
    'green': 0.8980392,
    'blue': 0.6
  },
  green: {
    'red': 0.7137255,
    'green': 0.84313726,
    'blue': 0.65882355
  }
}

class GoogleSheetGenerator {
  static generate (callback) {
    // TODO Spreadsheet for SLRs
    GoogleSheetGenerator.createSpreadsheet((err, spreadsheetMetadata) => {
      if (err) {
        Alerts.errorAlert({title: 'Error creating spreadsheet'})
      } else {
        let spreadsheetId = spreadsheetMetadata.spreadsheetId
        let sheetId = spreadsheetMetadata.sheetId
        let spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId
        if (sheetId) {
          spreadsheetUrl += '/edit#gid=' + sheetId
        }
        Alerts.infoAlert({
          title: 'Spreadsheet correctly created',
          text: 'This is your spreadsheet URL: <a href="' + spreadsheetUrl + '" target="_blank">' + spreadsheetUrl + '</a>'
        })
      }
    })
  }

  static createSpreadsheet (callback) {
    // TODO Check if slr:spreadsheet annotation exists
    // TODO If exists, ask user overwrite or create new
    Alerts.loadingAlert({title: 'Creating spreadsheet', text: 'Please be patient...'})
    let promises = []
    // Promise to create spreadsheet
    promises.push(new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        scope: 'googleSheets',
        cmd: 'createSpreadsheet',
        data: {properties: {title: window.abwa.groupSelector.currentGroup.name}}
      }, (result) => {
        if (_.has(result.err)) {
          reject(result.err)
        } else {
          resolve({spreadsheet: result})
        }
      })
    }))
    // Promise to retrieve all annotations from current group
    promises.push(new Promise((resolve, reject) => {
      // TODO Change the limit of annotations
      window.abwa.storageManager.client.searchAnnotations({
        group: window.abwa.groupSelector.currentGroup.id,
        limit: 100000000,
        order: 'desc',
        sort: 'updated'
      }, (err, annotations) => {
        if (err) {
          reject(err)
        } else {
          resolve({annotations: annotations})
        }
      })
    }))
    Promise.all(promises).catch(() => {

    }).then((resolves) => {
      console.debug(resolves)
      let annotationsResolve = _.find(resolves, (resolve) => { return _.has(resolve, 'annotations') })
      let spreadsheetResolve = _.find(resolves, (resolve) => { return _.has(resolve, 'spreadsheet') })
      let spreadsheetId = spreadsheetResolve.spreadsheet.spreadsheetId
      // Get annotations for coding and assessing
      let slrInfo = GoogleSheetGenerator.getSLRInfoFromAnnotations(annotationsResolve.annotations)
      let primaryStudies = slrInfo.primaryStudies
      let sheetId = 0
      // Update spreadsheet with primary studies data
      let rows = []
      // Calculate for each code which one is the number of columns (multivalued use case)
      let columns = GoogleSheetGenerator.calculateColumns(primaryStudies)
      // First row is for codebook facets
      let themes = _.filter(window.abwa.tagManager.model.highlighterDefinition.themes, (code) => {
        return code.parentCode === null
      })
      rows.push(GoogleSheetGenerator.createHeaderSpreadsheetRow(themes, columns))
      // Retrieve rows for primary studies
      for (let i = 0; i < primaryStudies.length; i++) {
        rows.push(primaryStudies[i].toSpreadsheetRow(columns))
      }
      console.debug(rows)
      GoogleSheetGenerator.populateSpreadsheet({spreadsheetId, sheetId, rows, callback})
    })
  }

  static populateSpreadsheet ({spreadsheetId, sheetId, rows, callback}) {
    chrome.runtime.sendMessage({
      scope: 'googleSheets',
      cmd: 'updateSpreadsheet',
      data: {
        spreadsheetId: spreadsheetId,
        sheetId: sheetId,
        rows: rows,
        rowIndex: 0,
        columnIndex: 0
      }
    }, (result) => {
      if (_.has(result, 'error')) {
        callback(result.error)
      } else {
        callback(null, {spreadsheetId: spreadsheetId, sheetId: sheetId})
      }
    })
  }

  static createHeaderSpreadsheetRow (parentCodes, codesColumnCalc) {
    let cells = []
    // Title cell
    cells.push({
      userEnteredValue: {
        formulaValue: '=HYPERLINK("' + window.abwa.groupSelector.currentGroup.links.html + '", "Title")'
      }
    })
    // Fill columns headers and take into account for each parent code which one is the number of columns (multivalued use case)
    for (let i = 0; i < codesColumnCalc.length; i++) {
      let lengthOfCurrentColumn = codesColumnCalc[i].columns
      let theme = codesColumnCalc[i].theme
      for (let j = 0; j < lengthOfCurrentColumn; j++) {
        cells.push({
          userEnteredValue: {
            stringValue: theme.name
          }
        })
      }
    }
    return {
      values: cells
    }
  }

  static getSLRInfoFromAnnotations (annotations) {
    let codingAnnotations = _.filter(annotations, (annotation) => {
      return annotation.motivation === 'classifying' || annotation.motivation === 'oa:classifying'
    })
    let validatingAnnotations = _.filter(annotations, (annotation) => {
      return annotation.motivation === 'assessing' || annotation.motivation === 'oa:assessing'
    })
    let anAnnotationForEachPrimaryStudy = _.uniqWith(codingAnnotations, (a, b) => {
      return AnnotationUtils.areFromSameDocument(a, b)
    })
    let users = _.map(_.uniqBy(codingAnnotations, (anno) => { return anno['user'] }), 'user')
    // Create primary studies
    let primaryStudies = []
    for (let i = 0; i < anAnnotationForEachPrimaryStudy.length; i++) {
      let annotationForPrimaryStudy = anAnnotationForEachPrimaryStudy[i]
      let codingAnnotationsForPrimaryStudy = _.filter(codingAnnotations, (codingAnnotation) => {
        return AnnotationUtils.areFromSameDocument(annotationForPrimaryStudy, codingAnnotation)
      })
      // Retrieve from any annotation the document title
      let title
      try {
        // Look for any annotation with document title
        let annotationWithTitle = _.find(codingAnnotationsForPrimaryStudy, (annotation) => {
          if (annotation.documentMetadata) {
            return _.isString(annotation.documentMetadata.title)
          }
        })
        if (annotationWithTitle) {
          title = annotationWithTitle.documentMetadata.title
        } else {
          annotationWithTitle = _.find(codingAnnotationsForPrimaryStudy, (annotation) => {
            return _.isArray(annotation.document.title)
          })
          if (annotationWithTitle) {
            title = annotationWithTitle.document.title[0]
          }
        }
      } catch (e) {
        title = 'Primary Study ' + i
      }
      // Retrieve users for current primary study
      let usersForPrimaryStudy = _.map(_.uniqBy(codingAnnotationsForPrimaryStudy, (anno) => { return anno['user'] }), 'user')
      let primaryStudy = new PrimaryStudy({metadata: {url: annotationForPrimaryStudy.uri, title: title}, users: usersForPrimaryStudy}) // TODO Retrieve doi
      let parentCodes = GoogleSheetGenerator.parseCodesFromCodingAnnotations({
        codingAnnotations: codingAnnotationsForPrimaryStudy,
        validatingAnnotations
      })
      primaryStudy.codes = parentCodes
      primaryStudies.push(primaryStudy)
    }
    return {primaryStudies: primaryStudies, users: users}
  }

  static parseCodesFromCodingAnnotations ({codingAnnotations, validatingAnnotations}) {
    let classifiedThemes = {}
    for (let i = 0; i < codingAnnotations.length; i++) {
      let codingAnnotation = codingAnnotations[i]
      // Check if annotation is validated
      let validatingAnnotation = _.find(validatingAnnotations, (validatingAnnotation) => {
        let validatedAnnotationId = validatingAnnotation['oa:target'].replace('https://hypothes.is/api/annotations/', '')
        return codingAnnotation.id === validatedAnnotationId
      })
      // Get code or theme that is classified with
      let themeOrCode = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(codingAnnotation.tagId)
      let theme
      let code
      if (LanguageUtils.isInstanceOf(themeOrCode, Theme)) {
        theme = themeOrCode
      } else {
        theme = themeOrCode.theme
        code = themeOrCode
      }
      if (code) {
        // What is classified is the code
        if (classifiedThemes[theme.id]) {
          // Theme is already classified by another annotation
        } else {
          // Theme is not classified by any other annotation yet
          let chosenCodes = {}
          chosenCodes[code.id] = new Code({codeId: code.id, codeName: code.name, annotations: [codingAnnotation], validatingAnnotation})
          classifiedThemes[theme.id] = new Codes({theme, chosenCodes, multivalued: theme.multivalued})
        }
      } else {
        // What is classified is the theme
        if (classifiedThemes[theme.id]) {
          // Theme is already classified by another annotation, nothing to do if not validated
        } else {
          classifiedThemes[theme.id] = new Codes({theme, chosenCodes: {}, itself: codingAnnotation, multivalued: theme.multivalued})
        }
      }
    }
    return classifiedThemes
  }

  static calculateColumns (primaryStudies) {
    // Get all parent codes
    let themes = window.abwa.tagManager.model.highlighterDefinition.themes
    return themes.map((theme) => {
      let primaryStudyWithMaxValuesForThisCode = _.maxBy(primaryStudies, (ps) => {
        if (_.has(ps.codes, theme.id)) {
          return ps.codes[theme.id].numberOfColumns()
        } else {
          return 1
        }
      })
      if (!_.isUndefined(primaryStudyWithMaxValuesForThisCode) && _.has(primaryStudyWithMaxValuesForThisCode.codes, theme.id)) {
        return {theme: theme, columns: primaryStudyWithMaxValuesForThisCode.codes[theme.id].numberOfColumns()}
      } else {
        return {theme: theme, columns: 1}
      }
    })
  }
}

class PrimaryStudy {
  constructor ({metadata, codes, users}) {
    this.title = metadata.title
    this.url = metadata.url
    this.codes = codes
    this.users = users // Users that had codified this primary study
  }

  toSpreadsheetRow (codesColumnCalc) {
    let cells = []
    // Title column
    cells.push({
      userEnteredValue: {
        formulaValue: '=HYPERLINK("' + this.url + '", "' + this.title + '")'
      }
    })
    // Calculate the rest of the columns based on columnsCalc
    for (let i = 0; i < codesColumnCalc.length; i++) {
      let lengthOfCurrentColumn = codesColumnCalc[i].columns
      let theme = codesColumnCalc[i].theme
      if (_.has(this.codes, theme.id)) {
        // Filled cells
        let currentCodeCells = this.codes[theme.id].toCells(this.users)
        // Empty cells
        for (let j = currentCodeCells.length; j < lengthOfCurrentColumn; j++) {
          currentCodeCells.push({userEnteredValue: {stringValue: ''}})
        }
        cells = cells.concat(currentCodeCells)
      } else {
        // No evidence in current primary study for that code, all empty
        // Empty cells
        for (let j = 0; j < lengthOfCurrentColumn; j++) {
          cells.push({userEnteredValue: {stringValue: ''}})
        }
      }
    }
    return {
      values: cells
    }
  }
}

class Code {
  constructor ({codeId, codeName, annotations, validatingAnnotation}) {
    this.codeId = codeId
    this.codeName = codeName
    this.annotations = annotations
    this.validatingAnnotation = validatingAnnotation
  }

  toCell (users) {
    if (this.validatingAnnotation) {
      // Find validated annotation
      let validatedAnnotationId = this.validatingAnnotation['oa:target'].replace('https://hypothes.is/api/annotations/', '')
      let annotation = _.find(this.annotations, (annotation) => { return annotation.id === validatedAnnotationId })
      if (!_.isObject(annotation)) { // If not found, retrieve first annotation, but something is probably wrong
        annotation = this.annotations[0]
      }
      return {
        userEnteredValue: {
          formulaValue: '=HYPERLINK("' + annotation.uri + '#hag:' + annotation.id + '", "' + this.codeName + '")'
        },
        userEnteredFormat: {
          backgroundColor: HyperSheetColors.green
        }
      }
    } else {
      if (users.length > 1) {
        // Yellow or red, because more than one user has annotations in this Primary Study
        let allUsersWithThisCode = _.every(users, (user) => {
          return _.find(this.annotations, (annotation) => {
            return annotation.user === user
          })
        })
        let annotation = this.annotations[0]
        if (allUsersWithThisCode) {
          return {
            userEnteredValue: {
              formulaValue: '=HYPERLINK("' + annotation.uri + '#hag:' + annotation.id + '", "' + this.codeName + '")'
            },
            userEnteredFormat: {
              backgroundColor: HyperSheetColors.yellow
            }
          }
        } else {
          return {
            userEnteredValue: {
              formulaValue: '=HYPERLINK("' + annotation.uri + '#hag:' + annotation.id + '", "' + this.codeName + '")'
            },
            userEnteredFormat: {
              backgroundColor: HyperSheetColors.red
            }
          }
        }
      } else {
        // If only 1 user has annotated, it must be white
        let annotation = this.annotations[0]
        return {
          userEnteredValue: {
            formulaValue: '=HYPERLINK("' + annotation.uri + '#hag:' + annotation.id + '", "' + this.codeName + '")'
          }
        }
      }
    }
  }
}

Code.status = {
  'inProgress': {
    name: 'inProgress'
  },
  'conflicting': {
    name: 'conflicting'
  },
  'coinciding': {
    name: 'coinciding'
  },
  'validated': {
    name: 'validated'
  }
}

class Codes {
  constructor ({parentCode, chosenCodes = {}, itself, multivalued = false, validatingAnnotation}) {
    this.parentCode = parentCode
    this.chosenCodes = chosenCodes
    this.itself = itself
    this.multivalued = multivalued
    this.validatingAnnotation = validatingAnnotation
  }

  numberOfColumns () {
    if (this.multivalued) {
      return _.values(this.chosenCodes).length || 1
    } else {
      return 1
    }
  }

  toCells (allUsers) {
    let pairs = _.toPairs(this.chosenCodes)
    if (pairs.length > 0) {
      if (this.multivalued) {
        // If multivalued
        let chosenCodes = _.values(this.chosenCodes)
        let cells = []
        for (let i = 0; i < chosenCodes.length; i++) {
          let chosenCode = chosenCodes[i]
          cells.push(chosenCode.toCell(allUsers))
        }
        return cells
      } else {
        // No multivalued, codify status
        let chosenCodes = _.values(this.chosenCodes)
        // Check if someone is validated
        let validatedCode = _.find(chosenCodes, (chosenCode) => { return chosenCode.validatingAnnotation })
        if (validatedCode) {
          // Find validated annotation
          let validatedAnnotationId = validatedCode.validatingAnnotation['oa:target'].replace('https://hypothes.is/api/annotations/', '')
          let annotation = _.find(validatedCode.annotations, (annotation) => { return annotation.id === validatedAnnotationId })
          if (!_.isObject(annotation)) { // If not found, retrieve first annotation, but something is probably wrong
            annotation = validatedCode.annotations[0]
          }
          return [{
            userEnteredValue: {
              formulaValue: '=HYPERLINK("' + annotation.uri + '#hag:' + annotation.id + '", "' + validatedCode.codeName + '")'
            },
            userEnteredFormat: {
              backgroundColor: HyperSheetColors.green
            }
          }]
        } else {
          // Can be in conflict or coinciding, if more than one code, is conflicting, if only one, coinciding or in-progress
          if (chosenCodes.length > 1) {
            let annotation = chosenCodes[0].annotations[0] // Retrieve one annotation
            // Conflict
            return [{
              userEnteredValue: {
                formulaValue: '=HYPERLINK("' + annotation.uri + '#hag:' + annotation.id + '", "' + chosenCodes[0].codeName + '")'
              },
              userEnteredFormat: {
                backgroundColor: HyperSheetColors.red
              }
            }]
          } else {
            // Review all users
            let annotation = chosenCodes[0].annotations[0] // Retrieve one annotation
            let chosenCode = chosenCodes[0]
            let every = _.every(allUsers, (user) => {
              let index = _.findIndex(chosenCode.annotations, (annotation) => {
                return user === annotation.user
              })
              return index !== -1
            })
            /* let every = _.every(chosenCode.annotations, (annotation) => {
              let index = _.findIndex(allUsers, (user) => {
                return user === annotation.user
              })
              return index !== -1
            }) */
            if (every && allUsers.length > 1) {
              // All reviewers has annotated with that code and more than one reviewer has codified the PS
              return [{
                userEnteredValue: {
                  formulaValue: '=HYPERLINK("' + annotation.uri + '#hag:' + annotation.id + '", "' + chosenCodes[0].codeName + '")'
                },
                userEnteredFormat: {
                  backgroundColor: HyperSheetColors.yellow
                }
              }]
            } else {
              // Not all reviewers has annotated with that code or there is only one reviewer that has codified the PS
              return [{
                userEnteredValue: {
                  formulaValue: '=HYPERLINK("' + annotation.uri + '#hag:' + annotation.id + '", "' + chosenCodes[0].codeName + '")'
                }
              }]
            }
          }
        }
      }
    } else {
      if (this.itself) {
        // Get quote of annotation in itself
        let textQuoteSelector = _.find(this.itself.target[0].selector, (selector) => { return selector.type === 'TextQuoteSelector' })
        let quote = 'Quote'
        if (textQuoteSelector && textQuoteSelector.exact) {
          quote = textQuoteSelector.exact
        }
        if (this.validatingAnnotation) {
          return [
            {userEnteredValue: {
              formulaValue: '=HYPERLINK("' + this.itself.uri + '#hag:' + this.itself.id + '", "' + quote + '")'
            },
            userEnteredFormat: {
              backgroundColor: HyperSheetColors.yellow
            }
            }]
        } else {
          return [{userEnteredValue: {
            formulaValue: '=HYPERLINK("' + this.itself.uri + '#hag:' + this.itself.id + '", "' + quote + '")'
          }}]
        }
      }
    }
    return []
  }
}

module.exports = GoogleSheetGenerator
