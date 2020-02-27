const TextUtils = require('./utils/URLUtils')
const Config = require('./Config')
// PVSCL:IFCOND(Hypothesis,LINE)
const HypothesisClientManager = require('./annotationServer/hypothesis/HypothesisClientManager')
// PVSCL:ENDCOND
// PVSCL:IFCOND(BrowserStorage,LINE)
const BrowserStorageManager = require('./annotationServer/browserStorage/BrowserStorageManager')
// PVSCL:ENDCOND
const _ = require('lodash')

class ScienceDirectContentScript {
  init () {
    // Get if this tab has an annotation to open and a doi
    let params = TextUtils.extractHashParamsFromUrl(window.location.href)
    if (!_.isEmpty(params) && !_.isEmpty(params[Config.namespace])) {
      // Activate the extension
      chrome.runtime.sendMessage({scope: 'extension', cmd: 'activatePopup'}, (result) => {
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
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren()->pv:Size()=1, LINE)
    // PVSCL:IFCOND(Hypothesis, LINE)
    window.scienceDirect.annotationServerManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage, LINE)
    window.scienceDirect.annotationServerManager = new BrowserStorageManager()
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
    // PVSCL:ELSECOND
    chrome.runtime.sendMessage({scope: 'annotationServer', cmd: 'getSelectedAnnotationServer'}, ({annotationServer}) => {
      if (annotationServer === 'hypothesis') {
        // Hypothesis
        window.scienceDirect.annotationServerManager = new HypothesisClientManager()
      } else {
        // PVSCL:IFCOND(BrowserStorage,LINE)
        // Browser storage
        window.scienceDirect.annotationServerManager = new BrowserStorageManager()
        // PVSCL:ENDCOND
      }
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
    // PVSCL:ENDCOND
  }
}

window.scienceDirect = {}
window.scienceDirect.scienceDirectContentScript = new ScienceDirectContentScript()
window.scienceDirect.scienceDirectContentScript.init()
