import _ from 'lodash'
import GoogleDriveClient from '../../googleDrive/GoogleDriveClient'
import GoogleSheetClient from '../../googleSheets/GoogleSheetClient'
import BrowserStorageManager from '../browserStorage/BrowserStorageManager'
import Config from '../../Config'

class GoogleSheetAnnotationClient {
  constructor (token, manager) {
    this.token = token
    this.manager = manager
    this.papers = []
    this.cacheInterval = null
  }

  updateCacheDatabase (data, callback) {
    this.browserStorageManager = new BrowserStorageManager('db.annotations.gsheet.' + data.group.id)
    this.browserStorageManager.init()
    this.browserStorageManager.cleanDatabase((err) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        let client = new GoogleSheetClient(this.token)
        client.getSheetRowsRawData(data.group.id, Config.namespace, (err, result) => {
          if (err) {
            if (_.isFunction(callback)) {
              callback(err)
            }
          } else {
            result.shift() // Remove headers
            let annotations = result.map(encodedAnnotationRow => {
              try {
                return GoogleSheetAnnotationClient.decodeAnnotation(encodedAnnotationRow[1]) // The cell B (array[1]) has the encoded annotation (what we need), the other is just the ID
              } catch (e) {
                return null // Error parsing the annotation, ignoring
              }
            })
            annotations = _.compact(annotations)
            this.populateCache({
              annotations, user: data.user, groups: data.user.groups
            }, callback)
          }
        })
        // TODO Retrieve data from spreadsheet
        /* let spreadsheetId = data.group.id
        client.getSpreadSheetRows(spreadsheetId, [Config.spreadsheetsIds.getPaperRange], (err, result) => {
          if (err) {
            console.error('ERROR: ' + err + ' in ' + name)
          } else {
            for (let val in result.values) {
              let row = result.values[val]
              this.papers.push(row)
            }
          }
        })
        client.getSpreadSheetRows(
          spreadsheetId,
          [
            Config.spreadsheetsIds.getClassifyingRange,
            Config.spreadsheetsIds.getCodebookDevelopmentRange,
            Config.spreadsheetsIds.getLinkingRange,
            Config.spreadsheetsIds.getAssessingRange
          ],
          (err, result) => {
            if (err) {
              console.error('ERROR: ' + err + ' in ' + name)
            } else {
              let sheets = result.sheets
              let annotations = []
              let processedAnnotations = []
              for (let sh in sheets) {
                let sheet = sheets[sh]
                if (!_.isEmpty(sheet.data[0].rowData)) {
                  for (let rd = sheet.data[0].rowData.length - 1; rd >= 0; rd--) {
                    let rD = sheet.data[0].rowData[rd]
                    let status = rD.values[0].userEnteredValue.stringValue
                    let value = rD.values[1].userEnteredValue.stringValue
                    let an = GoogleSheetAnnotationClient.decodeAnnotation(value)
                    let annotation = JSON.parse(an)
                    if (processedAnnotations.indexOf(annotation.id) === -1) {
                      if (status === 'schema:ReplaceAction') {
                        annotations.push(annotation)
                      }
                      if (status === 'schema:CreateAction') {
                        annotations.push(annotation)
                      }
                      processedAnnotations.push(annotation.id)
                    }
                  }
                }
              }
              console.debug(JSON.stringify(annotations, null, 4))
              console.debug(JSON.stringify(processedAnnotations, null, 4))
              this.populateCache({
                annotations, user: data.user, groups: data.user.groups
              }, callback)
            }
          }) */
      }
    })
  }

  reloadCacheDatabase (data, callback) {
    let reloadData = data
    this.cacheInterval = setInterval(() => {
      this.updateCacheDatabase(reloadData)
    }, 5 * 60 * 1000) // The cache is reloaded every 5 minutes
    // Execute for the first time
    this.updateCacheDatabase(data, callback)
  }

  populateCache ({
    annotations = [],
    user = {
      userid: 'generic_user',
      display_name: 'Generic user'
    },
    groups = []
  }, callback) {
    // Populate cache
    this.browserStorageManager.annotationsDatabase.annotations = annotations
    this.browserStorageManager.annotationsDatabase.user = user
    this.browserStorageManager.annotationsDatabase.groups = groups
    this.browserStorageManager.saveDatabase(this.browserStorageManager.annotationsDatabase)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createNewAnnotation (annotation, callback) {
    this.browserStorageManager.client.createNewAnnotation(annotation, (err, browserStorageAnnotation) => { // browserStorageAnnotation includes generated ID
      if (err) {
        callback(err)
      } else {
        let client = new GoogleSheetClient(this.token)
        let row = { values: [[browserStorageAnnotation.id, GoogleSheetAnnotationClient.encodeAnnotation(browserStorageAnnotation)]] }
        client.appendRowSpreadSheet(browserStorageAnnotation.group, Config.namespace, row, (err) => {
          if (err) {
            callback(err)
          } else {
            callback(null, browserStorageAnnotation)
          }
        })
      }
    })
  }

  createNewAnnotations (annotations = [], callback) {
    this.browserStorageManager.client.createNewAnnotations(annotations, (err, browserStorageAnnotations) => {
      if (err) {
        callback(err)
      } else {
        let client = new GoogleSheetClient(this.token)
        let values = browserStorageAnnotations.map((browserStorageAnnotation) => {
          return [browserStorageAnnotation.id, GoogleSheetAnnotationClient.encodeAnnotation(browserStorageAnnotation)]
        })
        let row = { values: values }
        client.appendRowSpreadSheet(browserStorageAnnotations[0].group, Config.namespace, row, (err) => {
          if (err) {
            callback(err)
          } else {
            callback(null, browserStorageAnnotations)
          }
        })
      }
    })
  }

  searchAnnotations (data = {}, callback) {
    this.browserStorageManager.client.searchAnnotations(data, callback)
  }

  updateAnnotation (id, annotation, callback) {
    this.browserStorageManager.client.updateAnnotation(id, annotation, callback)
  }

  deleteAnnotation (id, callback) {
    this.browserStorageManager.client.deleteAnnotation(id, (err, browserStorageResult) => {
      if (err) {
        callback(err)
      } else {
        let client = new GoogleSheetClient(this.token)
        client.getSheetRowsRawData(browserStorageResult.annotation.group, Config.namespace, (err, response) => {
          if (err) {
            callback(err)
          } else {
            // Find the corresponding row
            let row = response.findIndex(row => { return row[0] === id })
            client.batchUpdate({
              spreadsheetId: browserStorageResult.annotation.group,
              requests: [{
                deleteDimension: {
                  range: {
                    dimension: 'ROWS',
                    startIndex: row,
                    endIndex: row + 1,
                    sheetId: 855346762 // TODO Parametrize this sheet number
                  }
                }
              }]
            }, (err, result) => {
              if (err) {
                callback(err)
              } else {
                callback(null, browserStorageResult)
              }
            })
          }
        })
      }
    })
  }

  deleteAnnotations (annotationsArray, callback) {
    this.browserStorageManager.client.deleteAnnotations(annotationsArray, (err, browserStorageResult) => {
      if (err) {
        callback(err)
      } else {
        let client = new GoogleSheetClient(this.token)
        if (_.has(browserStorageResult.annotations[0], 'group')) {
          client.getSheetRowsRawData(browserStorageResult.annotations[0].group, Config.namespace, (err, response) => {
            if (err) {
              callback(err)
            } else {
              // Find the corresponding row for all the annotations
              let rows = annotationsArray.map((id) => {
                return response.findIndex(row => { return row[0] === id })
              })
              rows = rows.sort((a, b) => b - a) // Sort from highest row to lowest (this is done to ensure all the rows are deleted, as if you delete first row 5 and then 6, the line 6 becomes 5 so then row 6 is never deleted)
              // Construct batch update call
              let requests = rows.map((rowNumber) => {
                return {
                  deleteDimension: {
                    range: {
                      dimension: 'ROWS',
                      startIndex: rowNumber,
                      endIndex: rowNumber + 1,
                      sheetId: 855346762 // TODO Parametrize this sheet number
                    }
                  }
                }
              })
              // Call google sheet client to delete corresponding cells
              client.batchUpdate({
                spreadsheetId: browserStorageResult.annotations[0].group,
                requests: requests
              }, (err, result) => {
                if (err) {
                  callback(err)
                } else {
                  callback(null, browserStorageResult)
                }
              })
            }
          })
        }
      }
    })
  }

  fetchAnnotation (id, callback) {
    this.browserStorageManager.client.fetchAnnotation(id, callback)
  }

  getListOfGroups (data, callback) { // TODO Check if data can be removed
    this.driveClient = new GoogleDriveClient(this.token)
    this.driveClient.listFiles({
      q: 'appProperties has {key="wacline" and value="' + Config.urlParamName + '"} and mimeType = "application/vnd.google-apps.spreadsheet" and trashed = false',
      supportsAllDrives: true // Search in user's drive and shared ones
    }, (err, list) => {
      if (err) {
        callback(err)
      } else {
        let groups = list.map(elem => {
          return {
            id: elem.id,
            name: elem.name,
            links: { html: 'https://docs.google.com/spreadsheets/d/' + elem.id },
            description: '',
            url: 'https://docs.google.com/spreadsheets/d/' + elem.id
          }
        })
        callback(null, groups)
      }
    })
  }

  getUserProfile (callback) {
    chrome.identity.getProfileUserInfo((data) => {
      this.getListOfGroups({}, (err, groups) => {
        if (err) {
          callback(err)
        } else {
          let profile = {
            userid: data.email,
            display_name: data.email // TODO Get google's name if possible
          }
          profile.groups = groups
          callback(null, profile)
        }
      })
    })
  }

  updateGroup (id, data, callback) {
    if (_.isString(id)) {
      // Copy google sheet using Google Drive API
      this.driveClient = new GoogleDriveClient(this.token)
      this.driveClient.updateFile(id, {
        name: data.name,
        appProperties: { wacline: Config.urlParamName }
      }, (err, response) => {
        if (err) {
          callback(err)
        } else {
          let group = {
            id: response.id,
            name: response.name,
            links: 'https://docs.google.com/spreadsheets/d/' + response.id
          }
          callback(null, group)
        }
      })
    } else {
      callback(new Error('Required parameter to update the group missing: id'))
    }
  }

  createNewGroup (data, callback) {
    // Copy google sheet using Google Drive API
    this.driveClient = new GoogleDriveClient(this.token)
    this.driveClient.copyFile({
      originFileId: '18iHV_QSgmT_v7girbKaILU8pPDz9br_gn93WIkH4Znw', // TODO Change this URL to Iker's spreadsheet
      data: {
        name: data.name,
        appProperties: { wacline: Config.urlParamName }
      }
    }, (err, response) => {
      if (err) {
        callback(err)
      } else {
        let group = {
          id: response.id,
          name: response.name,
          links: 'https://docs.google.com/spreadsheets/d/' + response.id
        }
        callback(null, group)
      }
    }) // TODO parametrize originFieldId
  }

  static setAnnotationPermissions (annotation, currentUser) {
    annotation.permissions = annotation.permissions || {}
    if (_.isEmpty(annotation.permissions.read)) {
      annotation.permissions.read = [currentUser.userid]
    }
    if (_.isEmpty(annotation.permissions.admin)) {
      annotation.permissions.admin = [currentUser.userid]
    }
    if (_.isEmpty(annotation.permissions.delete)) {
      annotation.permissions.delete = [currentUser.userid]
    }
    if (_.isEmpty(annotation.permissions.update)) {
      annotation.permissions.update = [currentUser.userid]
    }
  }

  removeAMemberFromAGroup ({ id, user = null }, callback) {
    // Copy google sheet using Google Drive API
    this.driveClient = new GoogleDriveClient(this.token)
    this.driveClient.trashFile(id, (err, result) => {
      if (err) {
        callback(new Error('Unable to trash spreadsheet, only the owner is able to do it. If you want to delete the file from this tool go to Google Drive and remove yourself from sharing options: https://docs.google.com/spreadsheets/d/' + id))
      } else {
        callback(null, result)
      }
    })
  }

  static encodeAnnotation (annotation) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(annotation))))
  }

  static decodeAnnotation (encodedAnnotation) {
    return JSON.parse(decodeURIComponent(escape(atob(encodedAnnotation))))
  }
}

export default GoogleSheetAnnotationClient
