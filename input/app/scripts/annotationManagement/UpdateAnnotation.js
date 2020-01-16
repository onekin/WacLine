const Events = require('../Events')
const _ = require('lodash')
const LanguageUtils = require('../utils/LanguageUtils')
const Alerts = require('../utils/Alerts')

class UpdateAnnotation {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for createAnnotation event
    this.initCreateAnnotationEvent()
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
        annotation,
        (err, annotation) => {
          if (err) {
            Alerts.errorAlert({text: 'Unexpected error, unable to create annotation'})
          } else {
            // Dispatch annotation created event
            LanguageUtils.dispatchCustomEvent(Events.annotationUpdated, {annotation: annotation})
          }
        })
    }
  }
}

module.exports = UpdateAnnotation
