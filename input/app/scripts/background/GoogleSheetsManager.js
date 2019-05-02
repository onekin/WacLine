class GoogleSheetsManager {
  init () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'googleSheets') {
        if (request.cmd === 'getToken') {
          chrome.identity.getAuthToken({ 'interactive': true }, function (token) {
            if (chrome.runtime.lastError) {
              sendResponse({error: chrome.runtime.lastError})
            } else {
              sendResponse({token: token})
            }
          })
          return true
        } else if (request.cmd === 'getTokenSilent') {
          chrome.identity.getAuthToken({ 'interactive': false }, function (token) {
            if (chrome.runtime.lastError) {
              sendResponse({error: chrome.runtime.lastError})
            } else {
              sendResponse({token: token})
            }
          })
          return true
        }
      }
    })
  }
}

module.exports = GoogleSheetsManager
