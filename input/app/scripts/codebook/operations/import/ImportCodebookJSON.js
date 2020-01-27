const Alerts = require('../../../utils/Alerts')
const FileUtils = require('../../../utils/FileUtils')
const Events = require('../../../Events')
const ImportCodebookJSON = require('./ImportCodebookJSON')

class ImportCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for export codebook event
    this.initImportCodebookEventHandler()
  }

  // EVENTS
  initExportCodebookEventHandler () {
    this.events.importCodebookEvent = {element: document, event: Events.importCodebook, handler: this.importCodebookEventHandler()}
    this.events.importCodebookEvent.element.addEventListener(this.events.importCodebookEvent.event, this.events.importCodebookEvent.handler, false)
  }
  static createConfigurationAnnotationsFromReview ({guide, callback}) {
    // Create highlighter annotations
    let annotations = guide.toAnnotations()
    // Send create highlighter
    window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, annotations) => {
      callback(err, annotations)
    })
  }

  static backupReviewGroup (callback) {
    // Get current group id
    let currentGroupId = window.abwa.groupSelector.currentGroup.id
    // Rename current group
    let date = new Date()
    let currentGroupNewName = 'ReviewAndGo-' + date.getFullYear() + '-' + date.getMonth() + '-' + date.getDay() + '-' + date.getHours()
    window.abwa.annotationServerManager.client.updateGroup(currentGroupId, {
      name: currentGroupNewName}, (err, result) => {
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

module.exports = ImportCodebook
