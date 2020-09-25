import _ from 'lodash'
import Codebook from '../../../model/Codebook'
import Alerts from '../../../../utils/Alerts'
import URLUtils from '../../../../utils/URLUtils'
import Config from '../../../../Config'

class GSheetParser {
  static parseCurrentSheet (callback) {
    const spreadsheetId = GSheetParser.retrieveSpreadsheetId()
    const sheetId = GSheetParser.retrieveSheetId()
    GSheetParser.retrieveCurrentToken((err, token) => {
      if (err) {
        callback(err)
      } else {
        GSheetParser.getSpreadsheet(spreadsheetId, token, (err, spreadsheet) => {
          if (err) {
            callback(err)
          } else {
            let sheetName
            // Retrieve spreadsheet title
            // PVSCL:IFCOND(Manual,LINE)
            sheetName = spreadsheet.properties.title
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(ApplicationBased,LINE)
            sheetName = Config.groupName
            // PVSCL:ENDCOND
            const codebook = Codebook.fromGoogleSheet({ spreadsheetId, sheetId, spreadsheet, sheetName })
            if (_.isError(codebook)) {
              callback(err)
            } else {
              if (_.isFunction(callback)) {
                callback(null, codebook)
              }
            }
          }
        })
      }
    })
  }

  static retrieveCurrentToken (callback) {
    chrome.runtime.sendMessage({ scope: 'googleSheets', cmd: 'getToken' }, (result) => {
      if (_.isFunction(callback)) {
        if (result.token) {
          callback(null, result.token)
        } else {
          callback(result.error)
        }
      }
    })
  }

  static getSpreadsheet (spreadsheetId, token, callback) {
    chrome.runtime.sendMessage({
      scope: 'googleSheets',
      cmd: 'getSpreadsheet',
      data: JSON.stringify({
        spreadsheetId: spreadsheetId
      })
    }, (response) => {
      if (response.error) {
        Alerts.errorAlert({
          text: 'You don\'t have permission to access the spreadsheet! Are you using the same Google account for the spreadsheet and for Google Chrome?<br/>If you don\'t know how to solve this problem: Please create on top right: "Share -> Get shareable link", and give edit permission.' // TODO i18n
        })
        callback(new Error('Unable to retrieve spreadsheet data. Permission denied.'))
      } else {
        try {
          const spreadsheet = JSON.parse(response.spreadsheet)
          callback(null, spreadsheet)
        } catch (e) {
          callback(e)
        }
      }
    })
  }

  static retrieveSpreadsheetId () {
    // Get current google sheet id
    this.spreadsheetId = window.location.href.match(/[-\w]{25,}/)[0]
    return window.location.href.match(/[-\w]{25,}/)[0]
  }

  static retrieveSheetId () {
    const hashParams = URLUtils.extractHashParamsFromUrl(window.location.href, '=')
    return parseInt(hashParams.gid)
  }
}

export default GSheetParser
