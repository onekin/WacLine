import GoogleSheetClient from '../googleSheets/GoogleSheetClient'
// PVSCL:IFCOND(GoogleSheetConsumer,LINE)
import _ from 'lodash'
// PVSCL:ENDCOND

class GoogleSheetsManager {
  constructor () {
    this.googleSheetClient = null
  }

  init () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'googleSheets') {
        if (request.cmd === 'getToken') {
          chrome.identity.getAuthToken({ interactive: true }, function (token) {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError })
            } else {
              sendResponse({ token: token })
            }
          })
          return true
        } else if (request.cmd === 'getTokenSilent') {
          chrome.identity.getAuthToken({ interactive: false }, function (token) {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError })
            } else {
              sendResponse({ token: token })
            }
          })
          return true
        }/* PVSCL:IFCOND(GoogleSheetProvider) */ else if (request.cmd === 'getSpreadsheet') {
          chrome.identity.getAuthToken({ interactive: true }, function (token) {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError })
            } else {
              const data = JSON.parse(request.data)
              if (data.spreadsheetId) {
                // Create client
                this.googleSheetClient = new GoogleSheetClient(token)
                this.googleSheetClient.getSpreadsheet(data.spreadsheetId, (err, spreadsheet) => {
                  if (err) {
                    sendResponse({ error: err })
                  } else {
                    sendResponse({ spreadsheet: JSON.stringify(spreadsheet) })
                  }
                })
              } else {
                sendResponse({ error: new Error('Spreadsheet id not found') })
              }
            }
          })
          return true
        } else if (request.cmd === 'batchUpdate') {
          chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError })
            } else {
              const data = JSON.parse(request.data)
              if (data.data) {
                this.googleSheetClient = new GoogleSheetClient(token)
                this.googleSheetClient.batchUpdate(data.data, (err) => {
                  if (err) {
                    sendResponse({ error: err })
                  } else {
                    sendResponse({ result: 'done' })
                  }
                })
              }
            }
          })
        }/* PVSCL:ENDCOND *//* PVSCL:IFCOND(GoogleSheetConsumer) */ else if (request.cmd === 'createSpreadsheet') {
          chrome.identity.getAuthToken({ interactive: true }, function (token) {
            if (_.isUndefined(token)) {
              sendResponse({ error: new Error('Unable to retrieve token, please check if you have synced your browser and your google account. If the application did not ask you for login, please contact developer.') })
            } else {
              this.googleSheetClient = new GoogleSheetClient(token)
              this.googleSheetClient.createSpreadsheet(request.data, (err, result) => {
                if (err) {
                  sendResponse({ error: err })
                } else {
                  sendResponse(result)
                }
              })
            }
          })
          return true
        } else if (request.cmd === 'updateSpreadsheet') {
          chrome.identity.getAuthToken({ interactive: true }, function (token) {
            this.googleSheetClient = new GoogleSheetClient(token)
            this.googleSheetClient.updateSheetCells(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          })
          return true
        }/* PVSCL:ENDCOND */
      }
    })
  }
}

export default GoogleSheetsManager
