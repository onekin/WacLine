import _ from 'lodash'
import Alerts from '../../../utils/Alerts'
import FileUtils from '../../../utils/FileUtils'
import Events from '../../../Events'
import Codebook from '../../model/Codebook'
import LanguageUtils from '../../../utils/LanguageUtils'

class ImportCodebookJSON {
  static import () {
    ImportCodebookJSON.askUserForConfigurationSchema((err, jsonObject) => {
      if (err) {
        Alerts.errorAlert({ text: 'Unable to parse json file. Error:<br/>' + err.message })
      } else {
        Alerts.inputTextAlert({
          alertType: Alerts.alertType.warning,
          title: 'Give a name to your imported review model',
          text: 'When the configuration is imported a new highlighter is created. You can return to your other review models using the sidebar.',
          inputPlaceholder: 'Type here the name of your review model...',
          preConfirm: (groupName) => {
            if (_.isString(groupName)) {
              if (groupName.length <= 0) {
                const swal = require('sweetalert2').default
                swal.showValidationMessage('Name cannot be empty.')
              } else if (groupName.length > 25) {
                const swal = require('sweetalert2').default
                swal.showValidationMessage('The review model name cannot be higher than 25 characters.')
              } else {
                return groupName
              }
            }
          },
          callback: (err, reviewName) => {
            if (err) {
              window.alert('Unable to load alert. Unexpected error, please contact developer.')
            } else {
              window.abwa.annotationServerManager.client.createNewGroup({ name: reviewName }, (err, newGroup) => {
                if (err) {
                  Alerts.errorAlert({ text: 'Unable to create a new annotation group. Error: ' + err.message })
                } else {
                  const guide = Codebook.fromObjects(jsonObject)
                  Codebook.setAnnotationServer(newGroup, (annotationServer) => {
                    guide.annotationServer = annotationServer
                    Alerts.loadingAlert({
                      title: 'Configuration in progress',
                      text: 'We are configuring everything to start reviewing.',
                      position: Alerts.position.center
                    })
                    ImportCodebookJSON.createConfigurationAnnotationsFromReview({
                      guide,
                      callback: (err) => {
                        if (err) {
                          Alerts.errorAlert({ text: 'There was an error when configuring Review&Go highlighter' })
                        } else {
                          Alerts.closeAlert()
                          LanguageUtils.dispatchCustomEvent(Events.codebookImported, { groupId: guide.annotationServer.getGroupId() })
                        }
                      }
                    })
                  })
                }
              })
            }
          }
        })
      }
    })
  }

  static createConfigurationAnnotationsFromReview ({ guide, callback }) {
    // Create highlighter annotations
    const annotations = guide.toAnnotations()
    // Send create highlighter
    window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, annotations) => {
      callback(err, annotations)
    })
  }

  static backupReviewGroup (callback) {
    // Get current group id
    const currentGroupId = window.abwa.groupSelector.currentGroup.id
    // Rename current group
    const date = new Date()
    const currentGroupNewName = 'ReviewAndGo-' + date.getFullYear() + '-' + date.getMonth() + '-' + date.getDay() + '-' + date.getHours()
    window.abwa.annotationServerManager.client.updateGroup(currentGroupId, { name: currentGroupNewName }, (err, result) => {
      if (err) {
        callback(new Error('Unable to backup current annotation group.'))
      } else {
        callback(null, result)
      }
    })
  }

  /**
   * Ask user for a configuration file in JSON and it returns a javascript object with the configuration
   * @param callback
   */
  static askUserForConfigurationSchema (callback) {
    // Ask user to upload the file
    Alerts.inputTextAlert({
      title: 'Upload your configuration file',
      html: 'Here you can upload your json file with the configuration for the Review&Go highlighter.',
      input: 'file',
      callback: (err, file) => {
        if (err) {
          window.alert('An unexpected error happened when trying to load the alert.')
        } else {
          // Read json file
          FileUtils.readJSONFile(file, (err, jsonObject) => {
            if (err) {
              callback(new Error('Unable to read json file: ' + err.message))
            } else {
              callback(null, jsonObject)
            }
          })
        }
      }
    })
  }
}

export default ImportCodebookJSON
