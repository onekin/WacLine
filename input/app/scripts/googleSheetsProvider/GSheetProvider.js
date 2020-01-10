const _ = require('lodash')
const GoogleSheetsClientManager = require('../googleSheets/GoogleSheetsClientManager')
const GSheetParser = require('./GSheetParser')
const GroupInitializer = require('./GroupInitializer')
const Alerts = require('../utils/Alerts')
const swal = require('sweetalert2')
// PVSCL:IFCOND(Hypothesis, LINE)
const HypothesisClientManager = require('../storage/hypothesis/HypothesisClientManager')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Local, LINE)
const LocalStorageManager = require('../storage/local/LocalStorageManager')
// PVSCL:ENDCOND

class GoogleSheetContentScriptManager {
  init (callback) {
    window.googleSheetProvider.googleSheetClientManager = new GoogleSheetsClientManager()
    this.loadStorage(() => {
      this.initLoginProcess((err, tokens) => {
        if (err) {
          swal('Oops!',
            'Unable to configure current spreadsheet. Failed login to services.', // TODO i18n
            'error') // Notify error to user
          if (_.isFunction(callback)) {
            callback()
          }
        } else {
          // Show tool is configuring prompt
          this.showToolIsConfiguring()
          // console.debug('Correctly logged in to hypothesis: %s', tokens.hypothesis)
          console.debug('Correctly logged in to gSheet: %s', tokens.gSheet)
          this.initGoogleSheetParsing(() => {
            // Execute callback without errors
            if (_.isFunction(callback)) {
              callback()
            }
          })
        }
      })
    })
  }

  showToolIsConfiguring () {
    swal({
      position: 'top-end',
      title: 'Configuring the tool, please be patient', // TODO i18n
      text: 'If the tool takes too much time, please reload the page and try again.',
      showConfirmButton: false,
      onOpen: () => {
        swal.showLoading()
      }
    })
  }

  initLoginProcess (callback) {
    window.googleSheetProvider.storageManager.logIn((err) => {
      if (err) {
        callback(err)
      } else {
        window.googleSheetProvider.googleSheetClientManager.logInGoogleSheets((err, gSheetToken) => {
          if (err) {
            callback(err)
          } else {
            callback(null, {
              gSheet: gSheetToken
            })
          }
        })
      }
    })
  }

  loadStorage (callback) {
    // PVSCL:IFCOND(Storage->pv:SelectedChildren()->pv:Size()=1, LINE)
    // PVSCL:IFCOND(Hypothesis, LINE)
    window.googleSheetProvider.storageManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Local, LINE)
    window.googleSheetProvider.storageManager = new LocalStorageManager()
    // PVSCL:ENDCOND
    window.googleSheetProvider.storageManager.init((err) => {
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
        window.googleSheetProvider.storageManager = new HypothesisClientManager()
      } else {
        // Local storage
        window.googleSheetProvider.storageManager = new LocalStorageManager()
      }
      window.googleSheetProvider.storageManager.init((err) => {
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

  initGoogleSheetParsing (callback) {
    window.googleSheetProvider.googleSheetParser = new GSheetParser()
    window.googleSheetProvider.googleSheetParser.parse((err, annotationGuide) => {
      if (err) {
        console.error(err)
        Alerts.errorAlert({text: err.message})
      } else {
        window.googleSheetProvider.GroupInitializer = new GroupInitializer()
        window.googleSheetProvider.GroupInitializer.init(annotationGuide, (err) => {
          if (err) {
            if (_.isFunction(callback)) {
              callback(err)
            }
          } else {
            if (_.isFunction(callback)) {
              callback()
            }
          }
        })
      }
    })
  }
}

module.exports = GoogleSheetContentScriptManager
