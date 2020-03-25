import GSheetProvider from './codebook/operations/create/googleSheetsProvider/GSheetProvider'
import _ from 'lodash'

window.addEventListener('load', () => {
  console.debug('Loaded sheet content script')
  // When page is loaded, popup button should be always deactivated
  chrome.runtime.sendMessage({ scope: 'extension', cmd: 'deactivatePopup' }, (result) => {
    console.log('Deactivated popup')
  })
  // When popup button is clicked
  chrome.extension.onMessage.addListener((msg, sender, sendResponse) => {
    if (_.isEmpty(window.googleSheetProvider)) {
      if (msg.action === 'initContentScript') {
        window.googleSheetProvider = {}
        window.googleSheetProvider.contentScriptManager = new GSheetProvider()
        window.googleSheetProvider.contentScriptManager.init(() => {
          // Disable the button of popup
          chrome.runtime.sendMessage({ scope: 'extension', cmd: 'deactivatePopup' }, (result) => {
            console.log('Deactivated popup')
          })
          window.googleSheetProvider = null
        })
      }
    }
  })
})
