const GoogleSheetClient = require('../googleSheets/GoogleSheetClient')

class GoogleSheetsManager {
  init () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'googleSheets') {
        if (request.cmd === 'getToken') {
          chrome.identity.getAuthToken({ 'interactive': true }, function (token) {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError })
            } else {
              sendResponse({ token: token })
            }
          })
          return true
        } else if (request.cmd === 'getTokenSilent') {
          chrome.identity.getAuthToken({ 'interactive': false }, function (token) {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError })
            } else {
              sendResponse({ token: token })
            }
          })
          return true
        } else if (request.cmd === 'getSpreadsheet') {
          chrome.identity.getAuthToken({ 'interactive': true }, function (token) {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError })
            } else {
              let data = JSON.parse(request.data)
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
          chrome.identity.getAuthToken({'interactive': true}, (token) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError })
            } else {
              let data = JSON.parse(request.data)
              if (data.data) {
                this.googleSheetClient = new GoogleSheetClient(token)
                this.googleSheetClient.batchUpdate(data.data, (err) => {
                  if (err) {
                    sendResponse({error: err})
                  } else {
                    sendResponse({result: 'done'})
                  }
                })
              }
            }
          })
        }
      }
    })
  }
}

module.exports = GoogleSheetsManager
