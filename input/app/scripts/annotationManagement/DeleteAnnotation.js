import Events from '../Events'
import _ from 'lodash'
import LanguageUtils from '../utils/LanguageUtils'
import Alerts from '../utils/Alerts'

class DeleteAnnotation {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for createAnnotation event
    this.initDeleteAnnotationEvent()
    // PVSCL:IFCOND(DeleteAll, LINE)
    // Add event listener for deleteAllAnnotations event
    this.initDeleteAllAnnotationsEvent()
    // PVSCL:ENDCOND
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  initDeleteAnnotationEvent (callback) {
    this.events.deleteAnnotationEvent = { element: document, event: Events.deleteAnnotation, handler: this.deleteAnnotationEventHandler() }
    this.events.deleteAnnotationEvent.element.addEventListener(this.events.deleteAnnotationEvent.event, this.events.deleteAnnotationEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }
  // PVSCL:IFCOND(DeleteAll, LINE)

  initDeleteAllAnnotationsEvent (callback) {
    this.events.deleteAllAnnotationEvent = { element: document, event: Events.deleteAllAnnotations, handler: this.deleteAllAnnotationsEventHandler() }
    this.events.deleteAllAnnotationEvent.element.addEventListener(this.events.deleteAllAnnotationEvent.event, this.events.deleteAllAnnotationEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  deleteAllAnnotationsEventHandler () {
    return () => {
      // Retrieve all the annotations
      const allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
      // Filter by current user's annotations, as other users are not deleteable
      const annotationsToDelete = allAnnotations.filter(annotation => {
        return annotation.creator === window.abwa.groupSelector.getCreatorData()
      })
      window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err) => {
        if (err) {
          Alerts.errorAlert({ text: 'Unable to delete all the annotations in the document. Please try it again.' })
        } else {
          LanguageUtils.dispatchCustomEvent(Events.deletedAllAnnotations, { annotations: annotationsToDelete })
        }
      })
    }
  }
  // PVSCL:ENDCOND

  deleteAnnotationEventHandler () {
    return (event) => {
      // Get annotation to delete
      const annotation = event.detail.annotation
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
                Alerts.errorAlert({ text: chrome.i18n.getMessage('errorDeletingHypothesisAnnotation') })
              } else {
                // Send annotation deleted event
                LanguageUtils.dispatchCustomEvent(Events.annotationDeleted, { annotation: annotation })
              }
            }
          })
        }
      })
    }
  }
}

export default DeleteAnnotation
