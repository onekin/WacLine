// PVSCL:IFCOND(Local,LINE)
const Alerts = require('../utils/Alerts')
const FileUtils = require('../utils/FileUtils')
const LocalStorageManager = require('../storage/local/LocalStorageManager')
const FileSaver = require('file-saver')
// PVSCL:ENDCOND
const _ = require('lodash')

class Options {
  init () {
    // PVSCL:IFCOND(Storage->pv:SelectedChildren()->pv:Size()>1,LINE)
    // Storage type
    document.querySelector('#storageDropdown').addEventListener('change', (event) => {
      // Get value
      if (event.target.selectedOptions && event.target.selectedOptions[0] && event.target.selectedOptions[0].value) {
        this.setStorage(event.target.selectedOptions[0].value)
        // Show/hide configuration for selected storage
        this.showSelectedStorageConfiguration(event.target.selectedOptions[0].value)
      }
    })
    chrome.runtime.sendMessage({scope: 'storage', cmd: 'getSelectedStorage'}, ({storage}) => {
      document.querySelector('#storageDropdown').value = storage
      this.showSelectedStorageConfiguration(storage)
    })
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Local,LINE)
    // Local storage restore
    document.querySelector('#restoreDatabaseButton').addEventListener('click', () => {
      Alerts.inputTextAlert({
        title: 'Upload your database backup file',
        html: 'Danger zone! <br/>This operation will override current local storage database, deleting all the annotations for all your documents. Please make a backup first.',
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
    // Local storage backup
    document.querySelector('#backupDatabaseButton').addEventListener('click', () => {
      this.backupDatabase()
    })
    // Local storage delete
    document.querySelector('#deleteDatabaseButton').addEventListener('click', () => {
      Alerts.confirmAlert({
        title: 'Deleting your database',
        alertType: Alerts.alertType.warning,
        text: 'Danger zone! <br/>This operation will override current local storage database, deleting all the annotations for all your documents. Please make a backup first.',
        callback: () => {
          this.deleteDatabase((err) => {
            if (err) {
              Alerts.errorAlert({text: 'Error deleting the database, please try it again or contact developer.'})
            } else {
              Alerts.successAlert({text: 'Local storage successfully deleted'})
            }
          })
        }
      })
    })
    // PVSCL:ENDCOND
  }
  // PVSCL:IFCOND(Local,LINE)

  restoreDatabase (jsonObject, callback) {
    window.options.localStorage = new LocalStorageManager()
    window.options.localStorage.init(() => {
      window.options.localStorage.saveDatabase(jsonObject, callback)
    })
  }

  backupDatabase () {
    window.options.localStorage = new LocalStorageManager()
    window.options.localStorage.init(() => {
      let stringifyObject = JSON.stringify(window.options.localStorage.annotationsDatabase, null, 2)
      // Download the file
      let blob = new window.Blob([stringifyObject], {
        type: 'text/plain;charset=utf-8'
      })
      let dateString = (new Date()).toISOString()
      FileSaver.saveAs(blob, 'Local-databaseBackup' + dateString + '.json')
    })
  }

  deleteDatabase (callback) {
    window.options.localStorage = new LocalStorageManager()
    window.options.localStorage.init(() => {
      window.options.localStorage.cleanDatabase(callback)
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Storage->pv:SelectedChildren()->pv:Size()>1,LINE)

  setStorage (storage) {
    chrome.runtime.sendMessage({
      scope: 'storage',
      cmd: 'setSelectedStorage',
      data: {storage: storage}
    }, ({storage}) => {
      console.debug('Storage selected ' + storage)
    })
  }
  // PVSCL:ENDCOND

  showSelectedStorageConfiguration (selectedStorage) {
    // Hide all storage configurations
    let storageConfigurationCards = document.querySelectorAll('.storageConfiguration')
    storageConfigurationCards.forEach((storageConfigurationCard) => {
      storageConfigurationCard.setAttribute('aria-hidden', 'true')
    })
    // Show corresponding selected storage configuration card
    let selectedStorageConfigurationCard = document.querySelector('#' + selectedStorage + 'ConfigurationCard')
    if (_.isElement(selectedStorageConfigurationCard)) {
      selectedStorageConfigurationCard.setAttribute('aria-hidden', 'false')
    }
  }
}

module.exports = Options
