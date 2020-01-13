// PVSCL:IFCOND(BrowserStorage,LINE)
const Alerts = require('../utils/Alerts')
const FileUtils = require('../utils/FileUtils')
const BrowserStorageManager = require('../annotationServer/browserStorage/BrowserStorageManager')
const FileSaver = require('file-saver')
// PVSCL:ENDCOND
const _ = require('lodash')

class Options {
  init () {
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren()->pv:Size()>1,LINE)
    // annotationServer type
    document.querySelector('#annotationServerDropdown').addEventListener('change', (event) => {
      // Get value
      if (event.target.selectedOptions && event.target.selectedOptions[0] && event.target.selectedOptions[0].value) {
        this.setAnnotationServer(event.target.selectedOptions[0].value)
        // Show/hide configuration for selected annotationServer
        this.showSelectedAnnotationServerConfiguration(event.target.selectedOptions[0].value)
      }
    })
    chrome.runtime.sendMessage({scope: 'annotationServer', cmd: 'getSelectedAnnotationServer'}, ({annotationServer}) => {
      document.querySelector('#annotationServerDropdown').value = annotationServer
      this.showSelectedAnnotationServerConfiguration(annotationServer)
    })
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage,LINE)
    // Browser annotationServer restore
    document.querySelector('#restoreDatabaseButton').addEventListener('click', () => {
      Alerts.inputTextAlert({
        title: 'Upload your database backup file',
        html: 'Danger zone! <br/>This operation will override current browser annotation server database, deleting all the annotations for all your documents. Please make a backup first.',
        type: Alerts.alertType.warning,
        input: 'file',
        callback: (err, file) => {
          if (err) {
            window.alert('An unexpected error happened when trying to load the alert.')
          } else {
            // Read json file
            FileUtils.readJSONFile(file, (err, jsonObject) => {
              if (err) {
                Alerts.errorAlert({text: 'Unable to read json file: ' + err.message})
              } else {
                this.restoreDatabase(jsonObject, (err) => {
                  if (err) {
                    Alerts.errorAlert({text: 'Something went wrong when trying to restore the database'})
                  } else {
                    Alerts.successAlert({text: 'Database restored.'})
                  }
                })
              }
            })
          }
        }
      })
    })
    // Browser storage backup
    document.querySelector('#backupDatabaseButton').addEventListener('click', () => {
      this.backupDatabase()
    })
    // Browser storage delete
    document.querySelector('#deleteDatabaseButton').addEventListener('click', () => {
      Alerts.confirmAlert({
        title: 'Deleting your database',
        alertType: Alerts.alertType.warning,
        text: 'Danger zone! <br/>This operation will override current browser storage database, deleting all the annotations for all your documents. Please make a backup first.',
        callback: () => {
          this.deleteDatabase((err) => {
            if (err) {
              Alerts.errorAlert({text: 'Error deleting the database, please try it again or contact developer.'})
            } else {
              Alerts.successAlert({text: 'Browser storage successfully deleted'})
            }
          })
        }
      })
    })
    // PVSCL:ENDCOND
  }
  // PVSCL:IFCOND(BrowserStorage,LINE)

  restoreDatabase (jsonObject, callback) {
    window.options.browserStorage = new BrowserStorageManager()
    window.options.browserStorage.init(() => {
      window.options.browserStorage.saveDatabase(jsonObject, callback)
    })
  }

  backupDatabase () {
    window.options.browserStorage = new BrowserStorageManager()
    window.options.browserStorage.init(() => {
      let stringifyObject = JSON.stringify(window.options.browserStorage.annotationsDatabase, null, 2)
      // Download the file
      let blob = new window.Blob([stringifyObject], {
        type: 'text/plain;charset=utf-8'
      })
      let dateString = (new Date()).toISOString()
      FileSaver.saveAs(blob, 'Local-databaseBackup' + dateString + '.json')
    })
  }

  deleteDatabase (callback) {
    window.options.browserStorage = new BrowserStorageManager()
    window.options.browserStorage.init(() => {
      window.options.browserStorage.cleanDatabase(callback)
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren()->pv:Size()>1,LINE)

  setAnnotationServer (annotationServer) {
    chrome.runtime.sendMessage({
      scope: 'annotationServer',
      cmd: 'setSelectedAnnotationServer',
      data: {annotationServer: annotationServer}
    }, ({annotationServer}) => {
      console.debug('Annotation server selected ' + annotationServer)
    })
  }
  // PVSCL:ENDCOND

  showSelectedAnnotationServerConfiguration (selectedAnnotationServer) {
    // Hide all annotation server configurations
    let annotationServerConfigurationCards = document.querySelectorAll('.annotationServerConfiguration')
    annotationServerConfigurationCards.forEach((annotationServerConfigurationCard) => {
      annotationServerConfigurationCard.setAttribute('aria-hidden', 'true')
    })
    // Show corresponding selected annotationServer configuration card
    let selectedAnnotationServerConfigurationCard = document.querySelector('#' + selectedAnnotationServer + 'ConfigurationCard')
    if (_.isElement(selectedAnnotationServerConfigurationCard)) {
      selectedAnnotationServerConfigurationCard.setAttribute('aria-hidden', 'false')
    }
  }
}

module.exports = Options
