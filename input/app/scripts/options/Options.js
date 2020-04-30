// PVSCL:IFCOND(BrowserStorage,LINE)
const Alerts = require('../utils/Alerts')
const FileUtils = require('../utils/FileUtils')
const BrowserStorageManager = require('../annotationServer/browserStorage/BrowserStorageManager')
const FileSaver = require('file-saver')
// PVSCL:ENDCOND
const _ = require('lodash')
// PVSCL:IFCOND(MoodleProvider or MoodleConsumer, LINE)
const URLUtils = require('../utils/URLUtils')
// PVSCL:ENDCOND
const $ = require('jquery')

class Options {
  init () {
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Size()>1, LINE)
    // annotationServer type
    document.querySelector('#annotationServerDropdown').addEventListener('change', (event) => {
      // Get value
      if (event.target.selectedOptions && event.target.selectedOptions[0] && event.target.selectedOptions[0].value) {
        this.setAnnotationServer(event.target.selectedOptions[0].value)
        // Show/hide configuration for selected annotationServer
        this.showSelectedAnnotationServerConfiguration(event.target.selectedOptions[0].value)
      }
    })
    chrome.runtime.sendMessage({
      scope: 'annotationServer',
      cmd: 'getSelectedAnnotationServer'
    }, ({annotationServer}) => {
      document.querySelector('#annotationServerDropdown').value = annotationServer
      this.showSelectedAnnotationServerConfiguration(annotationServer)
    })
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage,LINE)
    // Browser annotationServer view annotations
    document.querySelector('#viewAnnotationsButton').addEventListener('click', () => {
      window.open(chrome.extension.getURL('content/browserStorage/browserStorageSearch.html#'))
    })
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
    // PVSCL:IFCOND(CXLExportCmapCloud, LINE)
    // TODO Restore form from credentials saved in storage
    let cmapCloudButton = document.querySelector('#checkCmapValues')
    chrome.runtime.sendMessage({scope: 'cmapCloud', cmd: 'getUserData'}, (response) => {
      if (response.data) {
        let data = response.data
        if (data.userData.user && data.userData.password && data.userData.uid) {
          document.querySelector('#cmapCloudUserValue').value = data.userData.user
          document.querySelector('#cmapCloudPasswordValue').value = data.userData.password
          document.querySelector('#uidValue').innerHTML = 'User ID: ' + data.userData.uid
          $('#cmapCloudUserValue').prop('readonly', true)
          $('#cmapCloudPasswordValue').prop('readonly', true)
          cmapCloudButton.innerHTML = 'Change user credentials'
        }
      }
    })
    // Button listener
    cmapCloudButton.addEventListener('click', () => {
      if (cmapCloudButton.innerHTML === 'Change user credentials') {
        $('#cmapCloudUserValue').prop('readonly', false)
        $('#cmapCloudPasswordValue').prop('readonly', false)
        document.querySelector('#checkCmapValues').innerHTML = 'Validate account'
      } else if (cmapCloudButton.innerHTML === 'Validate account') {
        let userInputToValidate = document.querySelector('#cmapCloudUserValue').value
        let passwordInputToValidate = document.querySelector('#cmapCloudPasswordValue').value
        this.checkCmapCloudValues(userInputToValidate, passwordInputToValidate)
      }
    })
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Neo4J, LINE)
    // Neo4J Configuration
    this.neo4JEndpointElement = document.querySelector('#neo4jEndpoint')
    this.neo4JTokenElement = document.querySelector('#neo4jToken')
    this.neo4JUserElement = document.querySelector('#neo4jUser')
    this.neo4JEndpointElement.addEventListener('keyup', this.createNeo4JConfigurationSaveEventHandler())
    this.neo4JTokenElement.addEventListener('keyup', this.createNeo4JConfigurationSaveEventHandler())
    this.neo4JUserElement.addEventListener('keyup', this.createNeo4JConfigurationSaveEventHandler())
    // Restore form from credentials saved in storage
    chrome.runtime.sendMessage({scope: 'neo4j', cmd: 'getCredentials'}, ({credentials}) => {
      this.neo4JEndpointElement.value = credentials.endpoint || ''
      this.neo4JTokenElement.value = credentials.token || ''
      this.neo4JUserElement.value = credentials.user || ''
    })
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(MoodleConsumer or MoodleProvider, LINE)
    chrome.runtime.sendMessage({scope: 'moodle', cmd: 'getMoodleCustomEndpoint'}, (endpoint) => {
      document.querySelector('#moodleEndpoint').value = endpoint.endpoint
    })

    chrome.runtime.sendMessage({scope: 'moodle', cmd: 'isApiSimulationActivated'}, (isActivated) => {
      document.querySelector('#apiSimulationCheckbox').checked = isActivated.activated
    })
    document.querySelector('#apiSimulationCheckbox').addEventListener('change', () => {
      this.updateApiSimulationCheckbox()
    })
    document.querySelector('#moodleEndpoint').addEventListener('change', () => {
      this.updateMoodleEndpoint()
    })
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(MoodleResource, LINE)
    chrome.runtime.sendMessage({scope: 'moodle', cmd: 'isAutoOpenFilesActivated'}, (isActivated) => {
      document.querySelector('#autoOpenCheckbox').checked = isActivated.activated
    })
    document.querySelector('#autoOpenCheckbox').addEventListener('change', () => {
      this.updateAutoOpenCheckbox()
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
  // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren()->pv:Size()>1, LINE)

  setAnnotationServer (annotationServer) {
    chrome.runtime.sendMessage({
      scope: 'cmapCloud',
      cmd: 'getUserData'
    }, ({data}) => {
      console.debug('Annotation server selected ' + annotationServer)
    })
  }

  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Neo4J, LINE)

  createNeo4JConfigurationSaveEventHandler () {
    return (e) => {
      this.saveNeo4JConfiguration()
    }
  }

  saveNeo4JConfiguration () {
    // Check validity
    if (this.neo4JEndpointElement.checkValidity() && this.neo4JTokenElement.checkValidity() && this.neo4JUserElement.checkValidity()) {
      let credentials = {
        endpoint: this.neo4JEndpointElement.value,
        token: this.neo4JTokenElement.value,
        user: this.neo4JUserElement.value
      }
      chrome.runtime.sendMessage({
        scope: 'neo4j',
        cmd: 'setCredentials',
        data: {credentials: credentials}
      }, ({credentials}) => {
        console.debug('Saved credentials ' + JSON.stringify(credentials))
      })
    }
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

  // PVSCL:IFCOND(MoodleProvider or MoodleConsumer, LINE)

  updateApiSimulationCheckbox () {
    let isChecked = document.querySelector('#apiSimulationCheckbox').checked
    chrome.runtime.sendMessage({
      scope: 'moodle',
      cmd: 'setApiSimulationActivation',
      data: {isActivated: isChecked}
    }, (response) => {
      console.debug('Api simulation is updated to: ' + response.activated)
    })
  }

  updateMoodleEndpoint () {
    let value = document.querySelector('#moodleEndpoint').value
    let isValidUrl = URLUtils.isUrl(value)
    if (!isValidUrl) {
      isValidUrl = URLUtils.isUrl(value + '/')
      if (isValidUrl) {
        document.querySelector('#moodleEndpoint').value = value + '/'
      }
    }
    if (isValidUrl) {
      chrome.runtime.sendMessage({
        scope: 'moodle',
        cmd: 'setMoodleCustomEndpoint',
        data: {endpoint: value}
      }, ({endpoint}) => {
        console.debug('Endpoint updated to ' + endpoint.endpoint)
      })
    } else {
      Alerts.errorAlert({error: 'URL is malformed'}) // TODO i18n
    }
  }

  // PVSCL:ENDCOND
  // PVSCL:IFCOND(MoodleResource, LINE)

  updateAutoOpenCheckbox () {
    let isChecked = document.querySelector('#autoOpenCheckbox').checked
    chrome.runtime.sendMessage({
      scope: 'moodle',
      cmd: 'setAutoOpenFiles',
      data: {isActivated: isChecked}
    }, (response) => {
      console.debug('Api simulation is updated to: ' + response.activated)
    })
  }

  // PVSCL:ENDCOND
  // PVSCL:IFCOND(CXLExportCmapCloud, LINE)
  checkCmapCloudValues (user, password) {
    document.querySelector('#uidValue').className = 'textMessage'
    document.querySelector('#uidValue').innerHTML = 'Validating given credentials ... wait a moment please.'
    chrome.runtime.sendMessage({
      scope: 'cmapCloud',
      cmd: 'getUserUid',
      data: {user: user, password: password}
    }, (response) => {
      if (response.userData) {
        if (response.userData.uid) {
          document.querySelector('#uidValue').innerHTML = 'User ID: ' + response.userData.uid
          $('#cmapCloudUserValue').prop('readonly', true)
          $('#cmapCloudPasswordValue').prop('readonly', true)
          document.querySelector('#checkCmapValues').innerHTML = 'Change user credentials'
        }
        // validated
      } else if (response.err) {
        // Not validated
        document.querySelector('#uidValue').className = 'errorMessage'
        document.querySelector('#uidValue').innerHTML = 'Unable to retrieve the user id for the given credentials.'
      }
    })
  }
  // PVSCL:ENDCOND
}

module.exports = Options
