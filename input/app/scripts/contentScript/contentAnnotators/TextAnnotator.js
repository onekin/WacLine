const ContentAnnotator = require('./ContentAnnotator')
const ContentTypeManager = require('../ContentTypeManager')
const Events = require('../Events')
// const RolesManager = require('../RolesManager')
const DOMTextUtils = require('../../utils/DOMTextUtils')
const PDFTextUtils = require('../../utils/PDFTextUtils')
const LanguageUtils = require('../../utils/LanguageUtils')
const $ = require('jquery')
require('jquery-contextmenu/dist/jquery.contextMenu')
const _ = require('lodash')
require('components-jqueryui')
const Alerts = require('../../utils/Alerts')
const Theme = require('../../definition/Theme')
// PVSCL:IFCOND(Code,LINE)
const Code = require('../../definition/Code')
// PVSCL:ENDCOND
const ANNOTATION_OBSERVER_INTERVAL_IN_SECONDS = 3
const ANNOTATIONS_UPDATE_INTERVAL_IN_SECONDS = 60

// const ReviewAssistant = require('../../specific/review/ReviewAssistant')
// const Config = require('../../Config')

class TextAnnotator extends ContentAnnotator {
  constructor (config) {
    super()
    this.events = {}
    this.config = config
    this.observerInterval = null
    this.reloadInterval = null
    this.allAnnotations = null
    this.currentUserProfile = null
    this.highlightClassName = 'highlightedAnnotation'
  }

  init (callback) {
    this.initEvents(() => {
      // Retrieve current user profile
      this.currentUserProfile = window.abwa.groupSelector.user
      this.loadAnnotations(() => {
        this.initAnnotatorByAnnotation(() => {
          // Check if something is selected after loading annotations and display sidebar
          if (document.getSelection().toString().length !== 0) {
            if ($(document.getSelection().anchorNode).parents('#abwaSidebarWrapper').toArray().length === 0) {
              this.openSidebar()
            }
          }
          this.initAnnotationsObserver(() => {
            if (_.isFunction(callback)) {
              callback()
            }
          })
        })
      })
    })
  }

  initEvents (callback) {
    this.initSelectionEvents(() => {
      this.initAnnotateEvent(() => {
        this.initReloadAnnotationsEvent(() => {
          this.initDeleteAllAnnotationsEvent(() => {
            this.initDocumentURLChangeEvent(() => {
              this.initTagsUpdatedEvent(() => {
                // Reload annotations periodically
                if (_.isFunction(callback)) {
                  callback()
                }
              })
            })
          })
        })
      })
    })
  }

  initDocumentURLChangeEvent (callback) {
    this.events.documentURLChangeEvent = {element: document, event: Events.updatedDocumentURL, handler: this.createDocumentURLChangeEventHandler()}
    this.events.documentURLChangeEvent.element.addEventListener(this.events.documentURLChangeEvent.event, this.events.documentURLChangeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initDeleteAllAnnotationsEvent (callback) {
	//PVSCL:IFCOND(DeleteGroup,LINE)
    this.events.deleteAllAnnotationsEvent = {element: document, event: Events.deleteAllAnnotations, handler: this.createDeleteAllAnnotationsEventHandler()}
    this.events.deleteAllAnnotationsEvent.element.addEventListener(this.events.deleteAllAnnotationsEvent.event, this.events.deleteAllAnnotationsEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
    //PVSCL:ENDCOND
  }

  initTagsUpdatedEvent (callback) {
    this.events.tagsUpdated = {element: document, event: Events.tagsUpdated, handler: this.createtagsUpdatedEventHandler()}
    this.events.tagsUpdated.element.addEventListener(this.events.tagsUpdated.event, this.events.tagsUpdated.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createtagsUpdatedEventHandler (callback) {
    return () => {
      this.updateAllAnnotations(() => {
        console.debug('Updated all the annotations after Tags Updated event')
      })
    }
  }
//PVSCL:IFCOND(DeleteGroup,LINE)

  createDeleteAllAnnotationsEventHandler (callback) {
    return () => {
      this.deleteAllAnnotations(() => {
        console.debug('All annotations deleted')
      })
    }
  }
//PVSCL:ENDCOND

  createDocumentURLChangeEventHandler (callback) {
    return () => {
      this.loadAnnotations(() => {
        console.debug('annotations updated')
      })
    }
  }

  initReloadAnnotationsEvent (callback) {
    this.reloadInterval = setInterval(() => {
      this.updateAllAnnotations(() => {
        console.debug('annotations updated')
      })
    }, ANNOTATIONS_UPDATE_INTERVAL_IN_SECONDS * 1000)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initAnnotateEvent (callback) {
    this.events.annotateEvent = {element: document, event: Events.annotate, handler: this.createAnnotationEventHandler()}
    this.events.annotateEvent.element.addEventListener(this.events.annotateEvent.event, this.events.annotateEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createAnnotationEventHandler () {
    return (event) => {
      let selectors = []
      // If selection is empty, return null
      if (document.getSelection().toString().length === 0) {
        // If tag element is not checked, no navigation allowed
        if (event.detail.chosen === 'true') {
          // Navigate to the first annotation for this tag
          this.goToFirstAnnotationOfTag(event.detail.tags[0])
        } else {
          Alerts.infoAlert({text: chrome.i18n.getMessage('CurrentSelectionEmpty')})
        }
        return
      }
      // If selection is child of sidebar, return null
      if ($(document.getSelection().anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0) {
        Alerts.infoAlert({text: chrome.i18n.getMessage('CurrentSelectionNotAnnotable')})
        return
      }
      let range = document.getSelection().getRangeAt(0)
      // Create FragmentSelector
      if (_.findIndex(window.abwa.contentTypeManager.documentType.selectors, (elem) => { return elem === 'FragmentSelector' }) !== -1) {
        let fragmentSelector = null
        if (window.abwa.contentTypeManager.documentType === ContentTypeManager.documentTypes.pdf) {
          fragmentSelector = PDFTextUtils.getFragmentSelector(range)
        } else {
          fragmentSelector = DOMTextUtils.getFragmentSelector(range)
        }
        if (fragmentSelector) {
          selectors.push(fragmentSelector)
        }
      }
      // Create RangeSelector
      if (_.findIndex(window.abwa.contentTypeManager.documentType.selectors, (elem) => { return elem === 'RangeSelector' }) !== -1) {
        let rangeSelector = DOMTextUtils.getRangeSelector(range)
        if (rangeSelector) {
          selectors.push(rangeSelector)
        }
      }
      // Create TextPositionSelector
      if (_.findIndex(window.abwa.contentTypeManager.documentType.selectors, (elem) => { return elem === 'TextPositionSelector' }) !== -1) {
        let rootElement = window.abwa.contentTypeManager.getDocumentRootElement()
        let textPositionSelector = DOMTextUtils.getTextPositionSelector(range, rootElement)
        if (textPositionSelector) {
          selectors.push(textPositionSelector)
        }
      }
      // Create TextQuoteSelector
      if (_.findIndex(window.abwa.contentTypeManager.documentType.selectors, (elem) => { return elem === 'TextQuoteSelector' }) !== -1) {
        let textQuoteSelector = DOMTextUtils.getTextQuoteSelector(range)
        if (textQuoteSelector) {
          selectors.push(textQuoteSelector)
        }
      }
      // Construct the annotation to send to hypothesis
      let annotation = TextAnnotator.constructAnnotation({selectors, tags: event.detail.tags, tagId: event.detail.id})
      window.abwa.hypothesisClientManager.hypothesisClient.createNewAnnotation(annotation, (err, annotation) => {
        if (err) {
          Alerts.errorAlert({text: 'Unexpected error, unable to create annotation'})
        } else {
          // Add to annotations
          this.allAnnotations.push(annotation)
          LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
          // Send event annotation is created
          LanguageUtils.dispatchCustomEvent(Events.annotationCreated, {annotation: annotation})
          console.debug('Created annotation with ID: ' + annotation.id)
          this.highlightAnnotation(annotation, () => {
            window.getSelection().removeAllRanges()
          })
        }
      })
    }
  }

  static constructAnnotation ({selectors, tags = [], tagId}) {
    // Check if selectors exist, if then create a target for annotation, in other case the annotation will be a page annotation
    let target = []
    if (_.isObject(selectors)) {
      target.push({
        selector: selectors
      })
    }
    let data = {
      group: window.abwa.groupSelector.currentGroup.id,
      permissions: {
        read: ['group:' + window.abwa.groupSelector.currentGroup.id]
      },
      references: [],
      tags: tags,
      target: target,
      text: '',
      uri: window.abwa.contentTypeManager.getDocumentURIToSaveInHypothesis()
    }
    // Tag id
    if (tagId) {
      data.tagId = tagId
    }
    // For pdf files it is also send the relationship between pdf fingerprint and web url
    if (window.abwa.contentTypeManager.documentType === ContentTypeManager.documentTypes.pdf) {
      let pdfFingerprint = window.abwa.contentTypeManager.pdfFingerprint
      data.document = {
        documentFingerprint: pdfFingerprint,
        link: [{
          href: 'urn:x-pdf:' + pdfFingerprint
        }, {
          href: window.abwa.contentTypeManager.getDocumentURIToSaveInHypothesis()
        }]
      }
    }
    // If doi is available, add it to the annotation
    if (!_.isEmpty(window.abwa.contentTypeManager.doi)) {
      data.document = data.document || {}
      let doi = window.abwa.contentTypeManager.doi
      data.document.dc = { identifier: [doi] }
      data.document.highwire = { doi: [doi] }
      data.document.link = data.document.link || []
      data.document.link.push({href: 'doi:' + doi})
    }
    // If citation pdf is found
    if (!_.isEmpty(window.abwa.contentTypeManager.citationPdf)) {
      let pdfUrl = window.abwa.contentTypeManager.doi
      data.document.link = data.document.link || []
      data.document.link.push({href: pdfUrl, type: 'application/pdf'})
    }
    return data
  }

  initSelectionEvents (callback) {
    if (_.isEmpty(window.abwa.annotationBasedInitializer.initAnnotation)) {
      // Create selection event
      this.activateSelectionEvent(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      })
    } else {
      if (_.isFunction(callback)) {
        callback()
      }
    }
  }

  activateSelectionEvent (callback) {
    this.events.mouseUpOnDocumentHandler = {element: document, event: 'mouseup', handler: this.mouseUpOnDocumentHandlerConstructor()}
    this.events.mouseUpOnDocumentHandler.element.addEventListener(this.events.mouseUpOnDocumentHandler.event, this.events.mouseUpOnDocumentHandler.handler)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  disableSelectionEvent (callback) {
    this.events.mouseUpOnDocumentHandler.element.removeEventListener(
      this.events.mouseUpOnDocumentHandler.event,
      this.events.mouseUpOnDocumentHandler.handler)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  /**
   * Initializes annotations observer, to ensure dynamic web pages maintain highlights on the screen
   * @param callback Callback when initialization finishes
   */
  initAnnotationsObserver (callback) {
    this.observerInterval = setInterval(() => {
      console.debug('Observer interval')
      // If a swal is displayed, do not execute highlighting observer
      if (document.querySelector('.swal2-container') === null) { // TODO Look for a better solution...
        if (this.allAnnotations) {
          for (let i = 0; i < this.allAnnotations.length; i++) {
            let annotation = this.allAnnotations[i]
            // Search if annotation exist
            let element = document.querySelector('[data-annotation-id="' + annotation.id + '"]')
            // If annotation doesn't exist, try to find it
            if (!_.isElement(element)) {
              Promise.resolve().then(() => { this.highlightAnnotation(annotation) })
            }
          }
        }
      }
    }, ANNOTATION_OBSERVER_INTERVAL_IN_SECONDS * 1000)
    // TODO Improve the way to highlight to avoid this interval (when search in PDFs it is highlighted empty element instead of element)
    this.cleanInterval = setInterval(() => {
      console.debug('Clean interval')
      let highlightedElements = document.querySelectorAll('.highlightedAnnotation')
      highlightedElements.forEach((element) => {
        if (element.innerText === '') {
          $(element).remove()
        }
      })
    }, ANNOTATION_OBSERVER_INTERVAL_IN_SECONDS * 1000)
    // Callback
    if (_.isFunction(callback)) {
      callback()
    }
  }

  loadAnnotations (callback) {
    this.updateAllAnnotations((err) => {
      if (err) {
        // TODO Show user no able to load all annotations
        console.error('Unable to load annotations')
      } else {
        // Current annotations will be
        this.allAnnotations = this.retrieveCurrentAnnotations()
        LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
        // Highlight annotations in the DOM
        this.highlightAnnotations(this.allAnnotations)
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  updateAllAnnotations (callback) {
    // Retrieve annotations for current url and group
    window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({
      url: window.abwa.contentTypeManager.getDocumentURIToSearchInHypothesis(),
      uri: window.abwa.contentTypeManager.getDocumentURIToSaveInHypothesis(),
      group: window.abwa.groupSelector.currentGroup.id,
      order: 'asc'
    }, (err, annotations) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Search tagged annotations
        let filteringTags = window.abwa.tagManager.getFilteringTagList()
        this.allAnnotations = _.filter(annotations, (annotation) => {
          let tags = annotation.tags
          return !(tags.length > 0 && _.find(filteringTags, tags[0])) || (tags.length > 1 && _.find(filteringTags, tags[1]))
        })
        // Redraw all annotations
        this.redrawAnnotations()
        LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
        if (_.isFunction(callback)) {
          callback(null, this.allAnnotations)
        }
      }
    })
  }

  retrieveCurrentAnnotations () {
    return this.allAnnotations
  }

  highlightAnnotations (annotations, callback) {
    let promises = []
    annotations.forEach(annotation => {
      promises.push(new Promise((resolve) => {
        this.highlightAnnotation(annotation, resolve)
      }))
    })
    Promise.all(promises).then(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  highlightAnnotation (annotation, callback) {
    let classNameToHighlight = this.retrieveHighlightClassName(annotation)
    // Get annotation color for an annotation
    let tag = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(annotation.tagId)
    if (tag) {
      let color = tag.color
      try {
        let highlightedElements = DOMTextUtils.highlightContent(
          annotation.target[0].selector, classNameToHighlight, annotation.id)
        // Highlight in same color as button
        highlightedElements.forEach(highlightedElement => {
          // If need to highlight, set the color corresponding to, in other case, maintain its original color
          $(highlightedElement).css('background-color', color)
          // Set purpose color
          highlightedElement.dataset.color = color
       // PVSCL:IFCOND(ToolTip and SingleAnnotation,LINE)
          if (LanguageUtils.isInstanceOf(tag, Theme)) {
            // Set message
            highlightedElement.title = tag.name
          }PVSCL:IFCOND(Code) else if (LanguageUtils.isInstanceOf(tag, Code)) {
            highlightedElement.title = tag.theme.name + '\nCode: ' + tag.name
          }PVSCL:ENDCOND
          if (!_.isEmpty(annotation.text)) {
            try {
              let feedback = JSON.parse(annotation.text)
              highlightedElement.title += '\nFeedback: ' + feedback.comment
            } catch (e) {
              highlightedElement.title += '\nFeedback: ' + annotation.text
            }
          }
          // PVSCL:ENDCOND
        })
        // Create context menu event for highlighted elements
        this.createContextMenuForAnnotation(annotation)
        // Create click event to move to next annotation
        // this.createNextAnnotationHandler(annotation)
        // Create double click event handler
        this.createDoubleClickEventHandler(annotation)
      } catch (e) {
        // TODO Handle error (maybe send in callback the error ¿?)
        if (_.isFunction(callback)) {
          callback(new Error('Element not found'))
        }
      } finally {
        if (_.isFunction(callback)) {
          callback()
        }
      }
    }
  }

  createDoubleClickEventHandler (annotation) {
    let highlights = document.querySelectorAll('[data-annotation-id="' + annotation.id + '"]')
    for (let i = 0; i < highlights.length; i++) {
      let highlight = highlights[i]
      highlight.addEventListener('dblclick', () => {
        this.commentAnnotationHandler(annotation)
      })
    }
  }

  createContextMenuForAnnotation (annotation) {
    $.contextMenu({
      selector: '[data-annotation-id="' + annotation.id + '"]',
      build: () => {
        // Create items for context menu
        let items = {}
        // If current user is the same as author, allow to remove annotation or add a comment
        // PVSCL:IFCOND(Comment,LINE)
        items['comment'] = {name: 'Comment'}
        // PVSCL:ENDCOND
        items['delete'] = {name: 'Delete'}
        return {
          callback: (key, opt) => {
            if (key === 'delete') {
              this.deleteAnnotationHandler(annotation)
            }PVSCL:IFCOND(Comment) else if (key === 'comment') {
              this.commentAnnotationHandler(annotation)
            }PVSCL:ENDCOND
          },
          items: items
        }
      }
    })
  }

  deleteAnnotationHandler (annotation) {
    // Ask for confirmation
    Alerts.confirmAlert({
      alertType: Alerts.alertType.question,
      title: 'Delete annotation',
      text: 'Are you sure you want to delete this annotation?',
      callback: () => {
        // Delete annotation
        window.abwa.hypothesisClientManager.hypothesisClient.deleteAnnotation(annotation.id, (err, result) => {
          if (err) {
            // Unable to delete this annotation
            console.error('Error while trying to delete annotation %s', annotation.id)
          } else {
            if (!result.deleted) {
              // Alert user error happened
              Alerts.errorAlert({text: chrome.i18n.getMessage('errorDeletingHypothesisAnnotation')})
            } else {
              _.remove(this.allAnnotations, (currentAnnotation) => {
                return currentAnnotation.id === annotation.id
              })
              LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
              // Dispatch deleted annotation event
              LanguageUtils.dispatchCustomEvent(Events.annotationDeleted, {annotation: annotation})
              // Unhighlight annotation highlight elements
              DOMTextUtils.unHighlightElements([...document.querySelectorAll('[data-annotation-id="' + annotation.id + '"]')])
              console.debug('Deleted annotation ' + annotation.id)
            }
          }
        })
      }
    })
  }
//PVSCL:IFCOND(Comment,LINE)

  /**
   * Generates the HTML for comment form based on annotation, add reference autofill,...
   * @param annotation
   * @returns {Object}
   */
  generateCommentForm ({annotation}) {
    // TODO Mark and go previous assignments (AddReference): Get previous assignments
    // let previousAssignments = this.retrievePreviousAssignments()
    // let previousAssignmentsUI = this.createPreviousAssignmentsUI(previousAssignments)
    let html = ''
    /* if (previousAssignmentsUI) {
      html += previousAssignmentsUI.outerHTML
    } */
    html += '<textarea data-minchars="1" data-multiple id="comment" rows="6" autofocus>' + annotation.text + '</textarea>'

    // On before open
    let onBeforeOpen = () => {}
    // Preconfirm
    let preConfirmData = {}
    let preConfirm = () => {
      preConfirmData.comment = document.querySelector('#comment').value
    }
    // Callback
    let callback = (err, result) => {
      if (!_.isUndefined(preConfirmData.comment)) { // It was pressed OK button instead of cancel, so update the annotation
        if (err) {
          window.alert('Unable to load alert. Is this an annotable document?')
        } else {
          // Update annotation
          annotation.text = preConfirmData.comment || ''
          window.abwa.hypothesisClientManager.hypothesisClient.updateAnnotation(
            annotation.id,
            annotation,
            (err, annotation) => {
              if (err) {
                // Show error message
                Alerts.errorAlert({text: chrome.i18n.getMessage('errorUpdatingAnnotationComment')})
              } else {
                // Update all annotations
                let allIndex = _.findIndex(this.allAnnotations, (currentAnnotation) => {
                  return annotation.id === currentAnnotation.id
                })
                this.allAnnotations.splice(allIndex, 1, annotation)
                // Dispatch updated annotations events
                LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, {currentAnnotations: this.currentAnnotations})
                LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
                LanguageUtils.dispatchCustomEvent(Events.comment, {annotation: annotation})
                // Redraw annotations
                this.redrawAnnotations()
              }
            })
        }
      }
    }
    return {html: html, onBeforeOpen: onBeforeOpen, preConfirm: preConfirm, callback: callback}
  }

  commentAnnotationHandler (annotation) {
    // Close sidebar if opened
    let isSidebarOpened = window.abwa.sidebar.isOpened()
    this.closeSidebar()

    let themeOrCode = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(annotation.tagId)
    let title = ''
    if (themeOrCode) {
      title = themeOrCode.name
    }

    // Create form
    let form = this.generateCommentForm({annotation})

    Alerts.multipleInputAlert({
      title: title,
      html: form.html,
      onBeforeOpen: form.onBeforeOpen,
      // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
      preConfirm: form.preConfirm,
      callback: () => {
        form.callback()
        if (isSidebarOpened) {
          this.openSidebar()
        }
      }
    })
  }
// PVSCL:ENDCOND

  retrieveHighlightClassName () {
    return this.highlightClassName // TODO Depending on the status of the application
  }

  mouseUpOnDocumentHandlerConstructor () {
    return (event) => {
      // Check if something is selected
      if (document.getSelection().toString().length !== 0) {
        if ($(event.target).parents('#abwaSidebarWrapper').toArray().length === 0 &&
          $(event.target).parents('.swal2-container').toArray().length === 0 &&
          $(event.target).parents('#canvasContainer').toArray().length === 0
        ) {
          this.openSidebar()
        }
      } else {
        console.debug('Current selection is empty')
        // If selection is child of sidebar, return null
        if ($(event.target).parents('#abwaSidebarWrapper').toArray().length === 0 &&
          event.target.id !== 'context-menu-layer') {
          console.debug('Current selection is not child of the annotator sidebar')
          this.closeSidebar()
        }
      }
    }
  }

  goToFirstAnnotationOfTag (tag) {
    // TODO Retrieve first annotation for tag
    let annotation = _.find(this.allAnnotations, (annotation) => {
      return annotation.tags.includes(tag)
    })
    if (annotation) {
      this.goToAnnotation(annotation)
    }
  }

  goToAnnotation (annotation) {
    // If document is pdf, the DOM is dynamic, we must scroll to annotation using PDF.js FindController
    if (window.abwa.contentTypeManager.documentType === ContentTypeManager.documentTypes.pdf) {
      let queryTextSelector = _.find(annotation.target[0].selector, (selector) => { return selector.type === 'TextQuoteSelector' })
      if (queryTextSelector && queryTextSelector.exact) {
        // Get page for the annotation
        let fragmentSelector = _.find(annotation.target[0].selector, (selector) => { return selector.type === 'FragmentSelector' })
        if (fragmentSelector && fragmentSelector.page) {
          // Check if annotation was found by 'find' command, otherwise go to page
          if (window.PDFViewerApplication.page !== fragmentSelector.page) {
            window.PDFViewerApplication.page = fragmentSelector.page
          }
        }
        window.PDFViewerApplication.findController.executeCommand('find', {query: queryTextSelector.exact, phraseSearch: true})
        // Timeout to remove highlight used by PDF.js
        setTimeout(() => {
          let pdfjsHighlights = document.querySelectorAll('.highlight')
          for (let i = 0; pdfjsHighlights.length; i++) {
            pdfjsHighlights[i].classList.remove('highlight')
          }
        }, 1000)
      }
    } else { // Else, try to find the annotation by data-annotation-id element attribute
      let firstElementToScroll = document.querySelector('[data-annotation-id="' + annotation.id + '"]')
      if (!_.isElement(firstElementToScroll) && !_.isNumber(this.initializationTimeout)) {
        this.initializationTimeout = setTimeout(() => {
          console.debug('Trying to scroll to init annotation in 2 seconds')
          this.initAnnotatorByAnnotation()
        }, 2000)
      } else {
        firstElementToScroll.scrollIntoView({behavior: 'smooth', block: 'center'})
      }
    }
  }

  closeSidebar () {
    super.closeSidebar()
  }

  openSidebar () {
    super.openSidebar()
  }

  destroy () {
    // Remove observer interval
    clearInterval(this.observerInterval)
    // Clean interval
    clearInterval(this.cleanInterval)
    // Remove reload interval
    clearInterval(this.reloadInterval)
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    // Unhighlight all annotations
    this.unHighlightAllAnnotations()
  }

  unHighlightAllAnnotations () {
    // Remove created annotations
    let highlightedElements = [...document.querySelectorAll('[data-annotation-id]')]
    DOMTextUtils.unHighlightElements(highlightedElements)
  }

  initAnnotatorByAnnotation (callback) {
    // Check if init annotation exists
    if (window.abwa.annotationBasedInitializer.initAnnotation) {
      let initAnnotation = window.abwa.annotationBasedInitializer.initAnnotation
      // If document is pdf, the DOM is dynamic, we must scroll to annotation using PDF.js FindController
      if (window.abwa.contentTypeManager.documentType === ContentTypeManager.documentTypes.pdf) {
        let queryTextSelector = _.find(initAnnotation.target[0].selector, (selector) => { return selector.type === 'TextQuoteSelector' })
        if (queryTextSelector && queryTextSelector.exact) {
          window.PDFViewerApplication.findController.executeCommand('find', {query: queryTextSelector.exact, phraseSearch: true})
        }
      } else { // Else, try to find the annotation by data-annotation-id element attribute
        let firstElementToScroll = document.querySelector('[data-annotation-id="' + initAnnotation.id + '"]')
        if (!_.isElement(firstElementToScroll) && !_.isNumber(this.initializationTimeout)) {
          this.initializationTimeout = setTimeout(() => {
            console.debug('Trying to scroll to init annotation in 2 seconds')
            this.initAnnotatorByAnnotation()
          }, 2000)
        } else {
          if (_.isElement(firstElementToScroll)) {
            firstElementToScroll.scrollIntoView({behavior: 'smooth', block: 'center'})
          } else {
            // Unable to go to the annotation
          }
        }
      }
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }

  /**
   * Giving a list of old tags it changes all the annotations for the current document to the new tags
   * @param oldTags
   * @param newTags
   * @param callback Error, Result
   */
  updateTagsForAllAnnotationsWithTag (oldTags, newTags, callback) {
    // Get all annotations with oldTags
    let oldTagsAnnotations = _.filter(this.allAnnotations, (annotation) => {
      let tags = annotation.tags
      return oldTags.every((oldTag) => {
        return tags.includes(oldTag)
      })
    })
    let promises = []
    for (let i = 0; i < oldTagsAnnotations.length; i++) {
      let oldTagAnnotation = oldTagsAnnotations[i]
      promises.push(new Promise((resolve, reject) => {
        oldTagAnnotation.tags = newTags
        window.abwa.hypothesisClientManager.hypothesisClient.updateAnnotation(oldTagAnnotation.id, oldTagAnnotation, (err, annotation) => {
          if (err) {
            reject(new Error('Unable to update annotation ' + oldTagAnnotation.id))
          } else {
            resolve(annotation)
          }
        })
      }))
    }
    let annotations = []
    Promise.all(promises).then((result) => {
      // All annotations updated
      annotations = result
    }).finally((result) => {
      if (_.isFunction(callback)) {
        callback(null, annotations)
      }
    })
  }

  redrawAnnotations () {
    // Unhighlight all annotations
    this.unHighlightAllAnnotations()
    // Highlight all annotations
    this.highlightAnnotations(this.allAnnotations)
  }

  deleteAllAnnotations () {
    // Retrieve all the annotations
    let allAnnotations = this.allAnnotations
    // Delete all the annotations
    let promises = []
    for (let i = 0; i < allAnnotations.length; i++) {
      promises.push(new Promise((resolve, reject) => {
        window.abwa.hypothesisClientManager.hypothesisClient.deleteAnnotation(allAnnotations[i].id, (err) => {
          if (err) {
            reject(new Error('Unable to delete annotation id: ' + allAnnotations[i].id))
          } else {
            resolve()
          }
        })
        return true
      }))
    }
    // When all the annotations are deleted
    Promise.all(promises).catch(() => {
      Alerts.errorAlert({text: 'There was an error when trying to delete all the annotations, please reload and try it again.'})
    }).then(() => {
      // Update annotation variables
      this.allAnnotations = []
      // Dispatch event and redraw annotations
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
      this.redrawAnnotations()
    })
  }
}

module.exports = TextAnnotator
