import AnnotationBasedInitializer from './contentScript/AnnotationBasedInitializer'
import ContentScriptManager from './contentScript/ContentScriptManager'
import _ from 'lodash'

console.debug('Loaded abwa content script')
if (_.isEmpty(window.abwa)) {
  window.abwa = {} // Global namespace for variables
  // Add listener for popup button click
  chrome.extension.onMessage.addListener((msg) => {
    if (_.isEmpty(window.abwa.contentScriptManager)) {
      window.abwa.contentScriptManager = new ContentScriptManager()
    }
    if (msg.action === 'initContentScript') {
      if (window.abwa.contentScriptManager.status === ContentScriptManager.status.notInitialized) {
        window.abwa.contentScriptManager.init()
      }
    } else if (msg.action === 'destroyContentScript') {
      if (window.abwa.contentScriptManager.status === ContentScriptManager.status.initialized) {
        window.abwa.contentScriptManager.destroy(() => {
          window.abwa = {} // Clean window.abwa variable
        })
      }
    }
  })
  // Check if uri contains annotation to initialize
  const promise = new Promise((resolve) => {
    // PVSCL:IFCOND(Dropbox, LINE)
    if (window.location.href.includes('dl.dropboxusercontent.com') && !window.location.href.includes('chrome-extension')) {
      chrome.runtime.onMessage.addListener((request, sender, sendresponse) => {
        let location = window.location.href + 'url::' + request.url
        if (request.annotationId) {
          const Config = require('./Config').default
          location += '&' + Config.urlParamName + ':' + request.annotationId
        }
        window.location.href = location
        resolve()
      })
    } else {
      resolve()
    }
    // PVSCL:ELSECOND
    resolve()
    // PVSCL:ENDCOND
  })
  promise.then(() => {
    // Check if uri contains annotation to initialize
    const annotation = AnnotationBasedInitializer.getAnnotationHashParam()
    const autoOpen = AnnotationBasedInitializer.isAutoOpenHashParam()
    if (annotation) {
      // If extension is not activated, activate
      chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, () => {
        console.debug('Activated popup by annotation')
      })
    } else if (autoOpen) {
      // If extension is not activated, activate
      chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, () => {
        console.debug('Activated popup by auto open')
      })
    } else {
      // Check if button is activated for this tab
      chrome.runtime.sendMessage({ scope: 'extension', cmd: 'amIActivated' }, (response) => {
        if (response.activated) {
          if (_.isEmpty(window.abwa.contentScriptManager)) {
            window.abwa.contentScriptManager = new ContentScriptManager()
            if (window.abwa.contentScriptManager.status === ContentScriptManager.status.notInitialized) {
              window.abwa.contentScriptManager.init()
            }
          }
        }
      })
    }
  })
}
