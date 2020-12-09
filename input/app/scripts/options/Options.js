import Alerts from '../utils/Alerts'
import _ from 'lodash'
// PVSCL:IFCOND(BrowserStorage,LINE)
import FileUtils from '../utils/FileUtils'
import BrowserStorageManager from '../annotationServer/browserStorage/BrowserStorageManager'
import FileSaver from 'file-saver'
// PVSCL:ENDCOND
// PVSCL:IFCOND(MoodleProvider or MoodleConsumer, LINE)
import URLUtils from '../utils/URLUtils'
// PVSCL:ENDCOND

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
    chrome.runtime.sendMessage({ scope: 'annotationServer', cmd: 'getSelectedAnnotationServer' }, ({ annotationServer }) => {
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
                Alerts.errorAlert({ text: 'Unable to read json file: ' + err.message })
              } else {
                this.restoreDatabase(jsonObject, (err) => {
                  if (err) {
                    Alerts.errorAlert({ text: 'Something went wrong when trying to restore the database' })
                  } else {
                    Alerts.successAlert({ text: 'Database restored.' })
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
              Alerts.errorAlert({ text: 'Error deleting the database, please try it again or contact developer.' })
            } else {
              Alerts.successAlert({ text: 'Browser storage successfully deleted' })
            }
          })
        }
      })
    })
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Hypothesis, LINE)
    // Hypothesis login
    this.hypothesisConfigurationContainerElement = document.querySelector('#hypothesisConfigurationCard')
    this.hypothesisConfigurationContainerElement.querySelector('#hypothesisLogin').addEventListener('click', this.createHypothesisLoginEventHandler())
    this.hypothesisConfigurationContainerElement.querySelector('#hypothesisLogout').addEventListener('click', this.createHypothesisLogoutEventHandler())
    this.hypothesisConfigurationContainerElement.querySelector('#hypothesisLoggedInUsername').addEventListener('click', this.createDisplayHypothesisLoginInfoEventHandler())
    // Get token and username if logged in
    chrome.runtime.sendMessage({ scope: 'hypothesis', cmd: 'getToken' }, ({ token }) => {
      if (_.isString(token)) {
        this.hypothesisToken = token
        chrome.runtime.sendMessage({ scope: 'hypothesisClient', cmd: 'getUserProfile' }, (profile) => {
          document.querySelector('#hypothesisLoggedInUsername').innerText = profile.userid
        })
        this.hypothesisConfigurationContainerElement.querySelector('#hypothesisLoginContainer').setAttribute('aria-hidden', 'true')
      } else {
        this.hypothesisConfigurationContainerElement.querySelector('#hypothesisLoggedInContainer').setAttribute('aria-hidden', 'true')
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
    chrome.runtime.sendMessage({ scope: 'neo4j', cmd: 'getCredentials' }, ({ credentials }) => {
      this.neo4JEndpointElement.value = credentials.endpoint || ''
      this.neo4JTokenElement.value = credentials.token || ''
      this.neo4JUserElement.value = credentials.user || ''
    })
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(MoodleConsumer or MoodleProvider, LINE)
    chrome.runtime.sendMessage({ scope: 'moodle', cmd: 'getMoodleCustomEndpoint' }, (endpoint) => {
      document.querySelector('#moodleEndpoint').value = endpoint.endpoint
    })

    chrome.runtime.sendMessage({ scope: 'moodle', cmd: 'isApiSimulationActivated' }, (isActivated) => {
      document.querySelector('#apiSimulationCheckbox').checked = isActivated.activated
    })
    document.querySelector('#apiSimulationCheckbox').addEventListener('change', () => {
      this.updateApiSimulationCheckbox()
    })
    document.querySelector('#moodleEndpoint').addEventListener('change', () => {
      this.updateMoodleEndpoint()
    })
    chrome.runtime.sendMessage({ scope: 'moodle', cmd: 'isMoodleUploadAnnotatedFilesActivated' }, (isActivated) => {
      document.querySelector('#moodleUploadAnnotatedFilesCheckbox').checked = isActivated.activated
    })
    document.querySelector('#moodleUploadAnnotatedFilesCheckbox').addEventListener('change', () => {
      this.updateMoodleUploadAnnotatedFilesCheckbox()
    })
    // PVSCL:IFCOND(MoodleProvider, LINE)
    chrome.runtime.sendMessage({ scope: 'moodle', cmd: 'isMoodleUpdateNotificationActivated' }, (isActivated) => {
      document.querySelector('#moodleUpdateNotificationCheckbox').checked = isActivated.activated
    })
    document.querySelector('#moodleUpdateNotificationCheckbox').addEventListener('change', () => {
      this.updateMoodleUpdateNotificationCheckbox()
    })
    // PVSCL:ENDCOND
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(MoodleResource, LINE)
    chrome.runtime.sendMessage({ scope: 'moodle', cmd: 'isAutoOpenFilesActivated' }, (isActivated) => {
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
      const stringifyObject = JSON.stringify(window.options.browserStorage.annotationsDatabase, null, 2)
      // Download the file
      const blob = new window.Blob([stringifyObject], {
        type: 'text/plain;charset=utf-8'
      })
      const dateString = (new Date()).toISOString()
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
  // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Size()>1, LINE)

  setAnnotationServer (annotationServer) {
    chrome.runtime.sendMessage({
      scope: 'annotationServer',
      cmd: 'setSelectedAnnotationServer',
      data: { annotationServer: annotationServer }
    }, ({ annotationServer }) => {
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
      const credentials = {
        endpoint: this.neo4JEndpointElement.value,
        token: this.neo4JTokenElement.value,
        user: this.neo4JUserElement.value
      }
      chrome.runtime.sendMessage({
        scope: 'neo4j',
        cmd: 'setCredentials',
        data: { credentials: credentials }
      }, ({ credentials }) => {
        console.debug('Saved credentials ' + JSON.stringify(credentials))
      })
    }
  }
  // PVSCL:ENDCOND

  showSelectedAnnotationServerConfiguration (selectedAnnotationServer) {
    // Hide all annotation server configurations
    const annotationServerConfigurationCards = document.querySelectorAll('.annotationServerConfiguration')
    annotationServerConfigurationCards.forEach((annotationServerConfigurationCard) => {
      annotationServerConfigurationCard.setAttribute('aria-hidden', 'true')
    })
    // Show corresponding selected annotationServer configuration card
    const selectedAnnotationServerConfigurationCard = document.querySelector('#' + selectedAnnotationServer + 'ConfigurationCard')
    if (_.isElement(selectedAnnotationServerConfigurationCard)) {
      selectedAnnotationServerConfigurationCard.setAttribute('aria-hidden', 'false')
    }
  }
  // PVSCL:IFCOND(MoodleProvider or MoodleConsumer, LINE)

  updateMoodleUpdateNotificationCheckbox () {
    const isChecked = document.querySelector('#moodleUpdateNotificationCheckbox').checked
    chrome.runtime.sendMessage({
      scope: 'moodle',
      cmd: 'setMoodleUpdateNotification',
      data: { isActivated: isChecked }
    }, (response) => {
      console.debug('Moodle update notification is updated to: ' + response.activated)
    })
  }

  updateApiSimulationCheckbox () {
    const isChecked = document.querySelector('#apiSimulationCheckbox').checked
    chrome.runtime.sendMessage({
      scope: 'moodle',
      cmd: 'setApiSimulationActivation',
      data: { isActivated: isChecked }
    }, (response) => {
      console.debug('Api simulation is updated to: ' + response.activated)
    })
  }

  updateMoodleEndpoint () {
    const value = document.querySelector('#moodleEndpoint').value
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
        data: { endpoint: value }
      }, ({ endpoint }) => {
        console.debug('Endpoint updated to ' + endpoint.endpoint)
      })
    } else {
      Alerts.errorAlert({ error: 'URL is malformed' }) // TODO i18n
    }
  }

  updateMoodleUploadAnnotatedFilesCheckbox () {
    const isChecked = document.querySelector('#moodleUploadAnnotatedFilesCheckbox').checked
    chrome.runtime.sendMessage({
      scope: 'moodle',
      cmd: 'setMoodleUploadAnnotatedFilesNotification',
      data: { isActivated: isChecked }
    }, (response) => {
      console.debug('Moodle annotated file upload is updated to: ' + response.activated)
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(MoodleResource, LINE)

  updateAutoOpenCheckbox () {
    const isChecked = document.querySelector('#autoOpenCheckbox').checked
    chrome.runtime.sendMessage({
      scope: 'moodle',
      cmd: 'setAutoOpenFiles',
      data: { isActivated: isChecked }
    }, (response) => {
      console.debug('Api simulation is updated to: ' + response.activated)
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Hypothesis, LINE)

  createHypothesisLoginEventHandler () {
    return () => {
      chrome.runtime.sendMessage({
        scope: 'hypothesis',
        cmd: 'userLoginForm'
      }, ({ token }) => {
        this.hypothesisToken = token
        setTimeout(() => {
          chrome.runtime.sendMessage({ scope: 'hypothesisClient', cmd: 'getUserProfile' }, (profile) => {
            document.querySelector('#hypothesisLoggedInUsername').innerText = profile.userid
            document.querySelector('#hypothesisLoggedInContainer').setAttribute('aria-hidden', 'false')
          })
          document.querySelector('#hypothesisLoginContainer').setAttribute('aria-hidden', 'true')
        }, 1000) // Time before sending request, as background hypothes.is client refresh every second
      })
    }
  }

  createHypothesisLogoutEventHandler () {
    return () => {
      chrome.runtime.sendMessage({
        scope: 'hypothesis',
        cmd: 'userLogout'
      }, () => {
        document.querySelector('#hypothesisLoggedInContainer').setAttribute('aria-hidden', 'true')
        document.querySelector('#hypothesisLoginContainer').setAttribute('aria-hidden', 'false')
        this.hypothesisToken = 'Unknown'
        document.querySelector('#hypothesisLoggedInUsername').innerText = 'Unknown user'
      })
    }
  }

  createDisplayHypothesisLoginInfoEventHandler () {
    return () => {
      Alerts.infoAlert({
        title: 'You are logged in Hypothes.is',
        text: 'Token: ' + window.options.hypothesisToken
      })
    }
  }
  // PVSCL:ENDCOND
}

export default Options
