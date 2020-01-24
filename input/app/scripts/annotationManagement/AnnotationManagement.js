const ReadAnnotation = require('./read/ReadAnnotation')
const CreateAnnotation = require('./create/CreateAnnotation')
const UpdateAnnotation = require('./UpdateAnnotation')
const DeleteAnnotation = require('./DeleteAnnotation')
const $ = require('jquery')
const _ = require('lodash')

class AnnotationManagement {
  constructor () {
    this.annotationCreator = new CreateAnnotation()
    this.annotationReader = new ReadAnnotation()
    this.annotationUpdater = new UpdateAnnotation()
    this.annotationDeleter = new DeleteAnnotation()
    this.events = {}
  }

  init (callback) {
    this.annotationCreator.init()
    this.annotationReader.init()
    this.annotationUpdater.init()
    this.annotationDeleter.init()
    this.activateSelectionEvent()
  }

  activateSelectionEvent (callback) {
    this.events.mouseUpOnDocumentHandler = {element: document, event: 'mouseup', handler: this.mouseUpOnDocumentHandlerConstructor()}
    this.events.mouseUpOnDocumentHandler.element.addEventListener(this.events.mouseUpOnDocumentHandler.event, this.events.mouseUpOnDocumentHandler.handler)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  mouseUpOnDocumentHandlerConstructor () {
    return (event) => {
      // Check if something is selected
      if (document.getSelection().toString().length !== 0) {
        if ($(event.target).parents('#abwaSidebarWrapper').toArray().length === 0 &&
          $(event.target).parents('.swal2-container').toArray().length === 0 &&
          $(event.target).parents('#canvasContainer').toArray().length === 0
        ) {
          window.abwa.sidebar.openSidebar()
        }
      } else {
        console.debug('Current selection is empty')
        // If selection is child of sidebar, return null
        if ($(event.target).parents('#abwaSidebarWrapper').toArray().length === 0 &&
          event.target.id !== 'context-menu-layer') {
          console.debug('Current selection is not child of the annotator sidebar')
          window.abwa.sidebar.closeSidebar()
        }
      }
    }
  }

  destroy () {
    // Destroy annotation operators
    this.annotationReader.destroy()
    this.annotationCreator.destroy()
    this.annotationUpdater.destroy()
    this.annotationDeleter.destroy()
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }
}

module.exports = AnnotationManagement
