import TextUtils from './utils/URLUtils'
import Config from './Config'
import _ from 'lodash'
// PVSCL:IFCOND(Hypothesis,LINE)
import HypothesisClientManager from './annotationServer/hypothesis/HypothesisClientManager'
// PVSCL:ENDCOND
// PVSCL:IFCOND(BrowserStorage,LINE)
import BrowserStorageManager from './annotationServer/browserStorage/BrowserStorageManager'
// PVSCL:ENDCOND
// PVSCL:IFCOND(GoogleSheetAnnotationServer, LINE)
import GoogleSheetAnnotationClientManager from './annotationServer/googleSheetAnnotationServer/GoogleSheetAnnotationClientManager'
// PVSCL:ENDCOND

class ScienceDirectContentScript {
  init () {
    // Get if this tab has an annotation to open and a doi
    const params = TextUtils.extractHashParamsFromUrl(window.location.href)
    if (!_.isEmpty(params) && !_.isEmpty(params[Config.urlParamName])) {
      // Activate the extension
      chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, (result) => {
        // Retrieve if annotation is done in current url or in pdf version
        this.loadAnnotationServer(() => {
          window.scienceDirect.annotationServerManager.client.fetchAnnotation(params[Config.namespace], (err, annotation) => {
            if (err) {
              console.error(err)
            } else {
              // TODO Check if annotation is from this page
            }
          })
        })
      })
    }
  }

  loadAnnotationServer (callback) {
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Size() = 1, LINE)
    chrome.runtime.sendMessage({ scope: 'annotationServer', cmd: 'getSelectedAnnotationServer' }, ({ annotationServer }) => {
      // PVSCL:IFCOND(Hypothesis, LINE)
      if (annotationServer === 'hypothesis') {
        // Hypothesis
        window.scienceDirect.annotationServerManager = new HypothesisClientManager()
      }
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(BrowserStorage, LINE)
      if (annotationServer === 'browserstorage') {
        // Browser storage
        window.scienceDirect.annotationServerManager = new BrowserStorageManager()
      }
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(GoogleSheetAnnotationServer, LINE)
      if (annotationServer === 'googlesheetannotationserver') {
        // Google sheet as annotation storage
        window.scienceDirect.annotationServerManager = new GoogleSheetAnnotationClientManager()
      }
      // PVSCL:ENDCOND
      window.scienceDirect.annotationServerManager.init((err) => {
        if (_.isFunction(callback)) {
          if (err) {
            callback(err)
          } else {
            callback()
          }
        }
      })
    })
    // PVSCL:ELSECOND
    // PVSCL:IFCOND(Hypothesis,LINE)
    window.scienceDirect.annotationServerManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage,LINE)
    window.scienceDirect.annotationServerManager = new BrowserStorageManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(GoogleSheetAnnotationServer, LINE)
    window.scienceDirect.annotationServerManager = new GoogleSheetAnnotationClientManager()
    // PVSCL:ENDCOND
    // PVSCL:ENDCOND
    window.scienceDirect.annotationServerManager.init((err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      }
    })
  }
}

window.scienceDirect = {}
window.scienceDirect.scienceDirectContentScript = new ScienceDirectContentScript()
window.scienceDirect.scienceDirectContentScript.init()
