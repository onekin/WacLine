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
    this.initDeleteAnnotationEvent()
    // Add event listener for deleteAllAnnotations event
    this.deleteAllAnnotationsEvent()
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  initDeleteAnnotationEvent (callback) {
    this.events.deleteAnnotationEvent = {element: document, event: Events.deleteAnnotation, handler: this.deleteAnnotationEventHandler()}
    this.events.deleteAnnotationEvent.element.addEventListener(this.events.deleteAnnotationEvent.event, this.events.deleteAnnotationEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  deleteAllAnnotationsEvent (callback) {
    this.events.deleteAllAnnotationEvent = {element: document, event: Events.deleteAllAnnotations, handler: this.deleteAllAnnotationsEventHandler()}
    this.events.deleteAllAnnotationEvent.element.addEventListener(this.events.deleteAllAnnotationEvent.event, this.events.deleteAllAnnotationEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  deleteAllAnnotationsEventHandler () {
    return () => {
      // Retrieve all the annotations
      let allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
      // Filter by current user's annotations, as other users are not deleteable
      let annotationsToDelete = allAnnotations.filter(annotation => {
        return annotation.creator === window.abwa.groupSelector.getCreatorData()
      })
      window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err) => {
        if (err) {
          Alerts.errorAlert({text: 'Unable to delete all the annotations in the document. Please try it again.'})
        } else {
          LanguageUtils.dispatchCustomEvent(Events.deletedAllAnnotations, {annotations: annotationsToDelete})
        }
      })
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
