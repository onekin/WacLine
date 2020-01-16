const Events = require('../Events')
const _ = require('lodash')
const LanguageUtils = require('../utils/LanguageUtils')
const Alerts = require('../utils/Alerts')

class DeleteAnnotation {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for createAnnotation event
    this.initCreateAnnotationEvent()
  }

  initCreateAnnotationEvent (callback) {
    this.events.deleteAnnotationEvent = {element: document, event: Events.deleteAnnotation, handler: this.deleteAnnotationEventHandler()}
    this.events.deleteAnnotationEvent.element.addEventListener(this.events.deleteAnnotationEvent.event, this.events.deleteAnnotationEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  deleteAnnotationEventHandler () {
    return (event) => {
      // Get annotation to delete
      let annotation = event.detail.annotation
      // Ask for confirmation
      Alerts.confirmAlert({
        alertType: Alerts.alertType.question,
        title: 'Delete annotation',
        text: 'Are you sure you want to delete this annotation?',
        callback: () => {
          // Delete annotation
          window.abwa.annotationServerManager.client.deleteAnnotation(annotation.id, (err, result) => {
            if (err) {
              // Unable to delete this annotation
              console.error('Error while trying to delete annotation %s', annotation.id)
            } else {
              if (!result.deleted) {
                // Alert user error happened
                Alerts.errorAlert({text: chrome.i18n.getMessage('errorDeletingHypothesisAnnotation')})
              } else {
                // Send annotation deleted event
                LanguageUtils.dispatchCustomEvent(Events.annotationDeleted, {annotation: annotation})
              }
            }
          })
        }
      })
    }
  }
}

module.exports = DeleteAnnotation
