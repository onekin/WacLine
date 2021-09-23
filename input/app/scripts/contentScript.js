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

      // PVSCL:IFCOND(GoogleTagManager, LINE)
      // eslint-disable-next-line quotes
      let gtmId = "PVSCL:EVAL(WebAnnotator.GoogleTagManager->pv:Attribute('tagManagerId'))"
      document.body.innerHTML += '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' + gtmId + '" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>'

      let element = document.createElement('script')
      element.setAttribute('type', 'text/javascript')
      element.appendChild(document.createTextNode('(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":    new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer","' + gtmId + '");'))
      document.head.appendChild(element)
      // PVSCL:ENDCOND

      if (window.abwa.contentScriptManager.status === ContentScriptManager.status.notInitialized) {
        window.abwa.contentScriptManager.init(() => {

        })
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
    // PVSCL:IFCOND(Dropbox, LINE)t
    if (window.location.href.includes('dl.dropboxusercontent.com') && !window.location.href.includes('chrome-extension')) {
      chrome.runtime.onMessage.addListener((request, sender, sendresponse) => {
        if (request.scope === 'dropbox' && request.cmd === 'redirection') {
          let url = new URL(window.location.href)
          if (!url.hash.includes('url:') && request.data.url) {
            let location = window.location.href + 'url::' + request.data.url
            if (request.data.annotationId) {
              location += '&hag:' + request.data.annotationId
            }
            window.location.href = location
          }
        }
        resolve()
      })
    } else if (window.location.href.includes('chrome-extension://')) {
      chrome.runtime.onMessage.addListener((request, sender, sendresponse) => {
        if (request.scope === 'dropbox' && request.cmd === 'redirection') {
          let currentUrlParam = window.location.href
          let currentUrl = new URL(currentUrlParam)
          let dynamicUrlParam = currentUrl.searchParams.get('file')
          let dynamicUrl = new URL(dynamicUrlParam)
          if (!dynamicUrl.hash.includes('url:') && request.data.url) {
            let definitiveUrl = 'url::' + request.data.url
            if (request.data.annotationId) {
              definitiveUrl += '&hag:' + request.data.annotationId
            }
            window.location.replace(currentUrlParam + encodeURIComponent(definitiveUrl))
          }
        }
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
