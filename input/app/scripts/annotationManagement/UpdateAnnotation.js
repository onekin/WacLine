const Events = require('../Events')
const _ = require('lodash')
const LanguageUtils = require('../utils/LanguageUtils')
const Alerts = require('../utils/Alerts')
const Annotation = require('./Annotation')

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
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  initCreateAnnotationEvent (callback) {
    this.events.updateAnnotationEvent = {element: document, event: Events.updateAnnotation, handler: this.updateAnnotationEventHandler()}
    this.events.updateAnnotationEvent.element.addEventListener(this.events.updateAnnotationEvent.event, this.events.updateAnnotationEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  updateAnnotationEventHandler () {
    return (event) => {
      // Get annotation to modify and merge body changes
      let bodyToUpdate = event.detail.body
      let annotation = event.detail.annotation
      let newBodyForAnnotation = _.uniqBy(_.concat(bodyToUpdate, annotation.body), a => a.purpose)
      annotation.body = newBodyForAnnotation
      // Send updated annotation to the server
      window.abwa.annotationServerManager.client.updateAnnotation(
        annotation.id,
        annotation.serialize(),
        (err, annotation) => {
          if (err) {
            Alerts.errorAlert({text: 'Unexpected error, unable to create annotation'})
          } else {
            // Deserialize retrieved annotation from the server
            let deserializedAnnotation = Annotation.deserialize(annotation)
            // Dispatch annotation created event
            LanguageUtils.dispatchCustomEvent(Events.annotationUpdated, {annotation: deserializedAnnotation})
          }
        })
    }
  }
}

module.exports = UpdateAnnotation
