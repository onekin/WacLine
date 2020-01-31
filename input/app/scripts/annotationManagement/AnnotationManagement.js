const ReadAnnotation = require('./read/ReadAnnotation')
const CreateAnnotation = require('./create/CreateAnnotation')
const UpdateAnnotation = require('./UpdateAnnotation')
const DeleteAnnotation = require('./DeleteAnnotation')
const $ = require('jquery')
const _ = require('lodash')
const PDF = require('../target/formats/PDF')

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

  goToAnnotation (annotation) {
    // If document is pdf, the DOM is dynamic, we must scroll to annotation using PDF.js FindController
    if (window.abwa.targetManager.documentFormat === PDF) {
      let queryTextSelector = _.find(annotation.target[0].selector, (selector) => { return selector.type === 'TextQuoteSelector' })
      if (queryTextSelector && queryTextSelector.exact) {
        // Get page for the annotation
        let fragmentSelector = _.find(annotation.target[0].selector, (selector) => { return selector.type === 'FragmentSelector' })
        if (fragmentSelector && fragmentSelector.page) {
          // Check if annotation was found by 'find' command, otherwise go to page
          if (window.PDFViewerApplication.page !== fragmentSelector.page) {
            window.PDFViewerApplication.page = fragmentSelector.page
            this.annotationReader.redrawAnnotations()
          }
        }
        window.PDFViewerApplication.findController.executeCommand('find', {query: queryTextSelector.exact, phraseSearch: true})
        // Timeout to remove highlight used by PDF.js
        this.removeFindTagsInPDFs()
      }
    } else { // Else, try to find the annotation by data-annotation-id element attribute
      let firstElementToScroll = document.querySelector('[data-annotation-id="' + annotation.id + '"]')
      // If go to annotation is done by init annotation and it is not found, wait for some seconds for ajax content to be loaded and try again to go to annotation
      if (!_.isElement(firstElementToScroll) && !_.isNumber(this.initializationTimeout)) { // It is done only once, if timeout does not exist previously (otherwise it won't finish never calling goToAnnotation
        this.initializationTimeout = setTimeout(() => {
          console.debug('Trying to scroll to init annotation in 2 seconds')
          this.initAnnotatorByAnnotation()
        }, 2000)
      } else {
        firstElementToScroll.scrollIntoView({behavior: 'smooth', block: 'center'})
      }
    }
  }

  removeFindTagsInPDFs () {
    setTimeout(() => {
      // Remove class for middle selected elements in find function of PDF.js
      document.querySelectorAll('.highlight.selected.middle').forEach(elem => {
        $(elem).removeClass('highlight selected middle')
      })
      // Remove wrap for begin and end selected elements in find function of PDF.js
      document.querySelectorAll('.highlight.selected').forEach(elem => {
        if (elem.children.length === 1) {
          $(elem.children[0]).unwrap()
        } else {
          $(document.createTextNode(elem.innerText)).insertAfter(elem)
          $(elem).remove()
        }
      })
    }, 1000)
  }
}

module.exports = AnnotationManagement
