const TextUtils = require('./utils/URLUtils')
const Config = require('./Config')
// PVSCL:IFCOND(Hypothesis,LINE)
const HypothesisClientManager = require('./storage/hypothesis/HypothesisClientManager')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Local,LINE)
const LocalStorageManager = require('./storage/local/LocalStorageManager')
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
        this.loadStorage(() => {
          window.scienceDirect.storageManager.client.fetchAnnotation(params[Config.namespace], (err, annotation) => {
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

  loadStorage (callback) {
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren()->pv:Size()=1, LINE)
    // PVSCL:IFCOND(Hypothesis, LINE)
    window.scienceDirect.storageManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Local, LINE)
    window.scienceDirect.storageManager = new LocalStorageManager()
    // PVSCL:ENDCOND
    window.scienceDirect.storageManager.init((err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      }
    })
    // PVSCL:ELSECOND
    chrome.runtime.sendMessage({scope: 'storage', cmd: 'getSelectedStorage'}, ({storage}) => {
      if (storage === 'hypothesis') {
        // Hypothesis
        window.scienceDirect.storageManager = new HypothesisClientManager()
      } else {
        // Local storage
        window.scienceDirect.storageManager = new LocalStorageManager()
      }
      window.scienceDirect.storageManager.init((err) => {
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
