const GoogleSheetClientManager = require('../../googleSheets/GoogleSheetsClientManager')
const _ = require('lodash')
const swal = require('sweetalert2')
const DOI = require('doi-regex')
const URLUtils = require('../../utils/URLUtils')

class PrimaryStudySheetManager {
  constructor () {
    this.sheetData = null
    this.primaryStudyRow = null
  }

  init (callback) {
    // Login in google sheets
    this.googleSheetClientManager = new GoogleSheetClientManager()
    this.googleSheetClientManager.init(() => {
      this.googleSheetClientManager.logInGoogleSheets((err) => {
        if (err) {
          swal({
            type: 'warning',
            title: 'Oops...',
            text: 'It is recommended to give permissions to google sheets. Part of the functionality of the extension will not work correctly.'
          })
          if (_.isFunction(callback)) {
            callback(err)
          }
        } else {
          if (_.isFunction(callback)) {
            callback(null)
          }
        }
      })
    })
  }

  retrievePrimaryStudyRow (callback, reload = true) {
    let promises = []
    if (reload || _.isEmpty(this.sheetData)) {
      promises.push(new Promise((resolve, reject) => {
        this.reloadGSheetData((err) => {
          if (err) {
            if (_.isFunction(callback)) {
              reject(err)
            }
          } else {
            resolve()
          }
        })
      }))
    }
    Promise.all(promises).catch((reason) => {
      if (_.isFunction(callback)) {
        callback(reason)
      }
    }).then(() => {
      let data = this.sheetData.data[0].rowData
      let primaryStudyRow = 0
      // Retrieve primary study row (if it has doi, compare with doi primary studies
      if (window.abwa.contentTypeManager.doi) {
        let doi = window.abwa.contentTypeManager.doi
        for (let i = 1; i < data.length && primaryStudyRow === 0; i++) {
          let link = this.googleSheetClientManager.googleSheetClient.getHyperlinkFromCell(data[i].values[0])
          if (link) {
            // If link is doi.org url
            let doiGroups = DOI.groups(link)
            if (!_.isEmpty(doiGroups) && !_.isEmpty(doiGroups[1])) {
              let rowDoi = DOI.groups(link)[1]
              if (!_.isEmpty(rowDoi) && doi === rowDoi) {
                primaryStudyRow = i
              }
            }
          }
        }
      }
      // If primary study is not found by doi, try by URL
      if (primaryStudyRow === 0) {
        let currentURL = window.abwa.contentTypeManager.getDocumentURIToSaveInHypothesis().replace(/(^\w+:|^)\/\//, '')
        for (let i = 1; i < data.length && primaryStudyRow === 0; i++) {
          if (_.isObject(data[i]) && _.isObject(data[i].values[0])) {
            let link = this.googleSheetClientManager.googleSheetClient.getHyperlinkFromCell(data[i].values[0])
            if (link) {
              if (URLUtils.areSameURI(currentURL, link)) {
                primaryStudyRow = i
              }
            }
          }
        }
      }
      console.debug('Primary study row %s', primaryStudyRow)
      if (_.isFunction(callback)) {
        if (primaryStudyRow > 0) {
          this.primaryStudyRow = primaryStudyRow
          callback(null, primaryStudyRow)
        } else {
          callback(new Error('Primary study not found in your hypersheet'))
        }
      }
    })
  }

  reloadGSheetData (callback) {
    let spreadsheetId = window.abwa.specific.mappingStudyManager.mappingStudy.spreadsheetId
    let sheetId = window.abwa.specific.mappingStudyManager.mappingStudy.sheetId
    this.googleSheetClientManager.googleSheetClient.getSheet({spreadsheetId: spreadsheetId, sheetId: sheetId}, (err, sheet) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        this.sheetData = sheet
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    })
  }

  getPrimaryStudyLink (callback) {
    this.retrievePrimaryStudyRow((err, row) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        let sheetData = this.sheetData
        let link = _.at(sheetData, 'data[0].rowData[' + row + '].values[0].hyperlink')
        if (_.isUndefined(link[0])) {
          callback(new Error('No link found for current primary study'))
        } else {
          callback(null, link[0])
        }
      }
    })
  }

  getGSheetData (callback, reload = true) {
    if (reload || _.isEmpty(this.sheetData)) {
      this.reloadGSheetData((err) => {
        if (err) {
          if (_.isFunction(callback)) {
            callback(err)
          }
        } else {
          if (_.isFunction(callback)) {
            callback(null, this.sheetData)
          }
        }
      })
    } else {
      if (_.isFunction(callback)) {
        callback(null, this.sheetData)
      }
    }
  }

  destroy () {

  }
}

module.exports = PrimaryStudySheetManager
