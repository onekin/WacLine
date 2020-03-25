import Events from '../Events'
import _ from 'lodash'
import LanguageUtils from '../utils/LanguageUtils'
import Alerts from '../utils/Alerts'
import Annotation from './Annotation'

class UpdateAnnotation {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for createAnnotation event
    this.initCreateAnnotationEvent()
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  initCreateAnnotationEvent (callback) {
    this.events.updateAnnotationEvent = { element: document, event: Events.updateAnnotation, handler: this.updateAnnotationEventHandler() }
    this.events.updateAnnotationEvent.element.addEventListener(this.events.updateAnnotationEvent.event, this.events.updateAnnotationEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  updateAnnotationEventHandler () {
    return (event) => {
      // Get annotation to update
      const annotation = event.detail.annotation
      // Send updated annotation to the server
      window.abwa.annotationServerManager.client.updateAnnotation(
        annotation.id,
        annotation.serialize(),
        (err, annotation) => {
          if (err) {
            Alerts.errorAlert({ text: 'Unexpected error, unable to create annotation' })
          } else {
            // Deserialize retrieved annotation from the server
            const deserializedAnnotation = Annotation.deserialize(annotation)
            // Dispatch annotation created event
            LanguageUtils.dispatchCustomEvent(Events.annotationUpdated, { annotation: deserializedAnnotation })
          }
        })
    }
  }
}

export default UpdateAnnotation
