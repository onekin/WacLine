const Events = require('../../Events')

class ReadCoodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for createAnnotation event
    this.initReadCoodebookEvent()
  }

  initReadCoodebookEvent (callback) {
    this.events.createCoodebookEvent = {element: document, event: Events.readCodebook, handler: this.createReadCoodebookHandler()}
    this.events.createCoodebookEvent.element.addEventListener(this.events.createCoodebookEvent.event, this.events.createCoodebookEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createReadCoodebookHandler () {
    return (event) => {
      // If selection is child of sidebar, return null
      if ($(document.getSelection().anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0) {
        Alerts.infoAlert({text: chrome.i18n.getMessage('CurrentSelectionNotAnnotable')})
        return
      }
      // Create target
      let target = this.obtainTargetToCreateAnnotation(event.detail)
      // Create body
      let body = this.obtainBodyToCreateAnnotation(event.detail)
      // Create tags
      let tags = this.obtainTagsToCreateAnnotation(event.detail)
      // Construct the annotation to send to hypothesis
      let annotation = CreateAnnotation.constructAnnotation({
        target: target,
        tags: tags,
        body: body
      })
      window.abwa.annotationServerManager.client.createNewAnnotation(annotation, (err, annotation) => {
        if (err) {
          Alerts.errorAlert({text: 'Unexpected error, unable to create annotation'})
        } else {
          window.getSelection().removeAllRanges()
          // Dispatch annotation created event
          LanguageUtils.dispatchCustomEvent(Events.annotationCreated, {annotation: annotation})
        }
      })
    }
  }
}

module.exports = CreateAnnotation
