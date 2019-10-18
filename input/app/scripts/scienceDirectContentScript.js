const TextUtils = require('./utils/URLUtils')
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
    if (!_.isEmpty(params) && !_.isEmpty(params.hag)) {
      // Activate the extension
      chrome.runtime.sendMessage({scope: 'extension', cmd: 'activatePopup'}, (result) => {
        // Retrieve if annotation is done in current url or in pdf version
        this.loadStorage(() => {
          window.hag.storageManager.client.fetchAnnotation(params.hag, (err, annotation) => {
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
    // PVSCL:IFCOND(Storage->pv:SelectedChildren()->pv:Size()=1, LINE)
    // PVSCL:IFCOND(Hypothesis, LINE)
    window.hag.storageManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Local, LINE)
    window.hag.storageManager = new LocalStorageManager()
    // PVSCL:ENDCOND
    window.hag.storageManager.init((err) => {
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
        window.hag.storageManager = new HypothesisClientManager()
      } else {
        // Local storage
        window.hag.storageManager = new LocalStorageManager()
      }
      window.hag.storageManager.init((err) => {
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

window.hag = {}
window.hag.scienceDirectContentScript = new ScienceDirectContentScript()
window.hag.scienceDirectContentScript.init()
