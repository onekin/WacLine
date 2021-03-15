import DOMTextUtils from '../../utils/DOMTextUtils'
// TODO const PDFTextUtils = require('../../utils/PDFTextUtils')
import LanguageUtils from '../../utils/LanguageUtils'
import Events from '../../Events'
import _ from 'lodash'
// PVSCL:IFCOND(UserFilter, LINE)
import UserFilter from './UserFilter'
// PVSCL:ENDCOND
import Annotation from '../Annotation'
// PVSCL:IFCOND(Replying, LINE)
import ReplyAnnotation from '../purposes/ReplyAnnotation'
// PVSCL:ENDCOND
import $ from 'jquery'
// PVSCL:IFCOND(Commenting, LINE)
import CommentingForm from '../purposes/CommentingForm'
import Alerts from '../../utils/Alerts'
// PVSCL:ENDCOND
// PVSCL:IFCOND(Remote, LINE)
import HypothesisClientManager from '../../annotationServer/hypothesis/HypothesisClientManager'
import Neo4JClientManager from '../../annotationServer/neo4j/Neo4JClientManager'
const ANNOTATIONS_UPDATE_INTERVAL_IN_SECONDS = 5
// PVSCL:ENDCOND
const ANNOTATION_OBSERVER_INTERVAL_IN_SECONDS = 3
require('jquery-contextmenu/dist/jquery.contextMenu')

class ReadAnnotation {
  constructor () {
    this.events = {}
  }

  init (callback) {
    // Event listener created annotation
    this.initAnnotationCreatedEventListener()
    // Event listener deleted annotation
    this.initAnnotationDeletedEventListener()
    // PVSCL:IFCOND(DeleteAll, LINE)
    // Event listener deleted all annotations
    this.initAllAnnotationsDeletedEventListener()
    // PVSCL:ENDCOND
    // Event listener updated annotation
    // PVSCL:IFCOND(Update, LINE)
    this.initAnnotationUpdatedEventListener()
    // PVSCL:ENDCOND
    this.loadAnnotations((err) => {
      // PVSCL:IFCOND(UserFilter, LINE)
      this.initUserFilter()
      this.initUserFilterChangeEvent()
      // PVSCL:ENDCOND
      if (_.isFunction(callback)) {
        callback(err)
      }
    })
    // PVSCL:IFCOND(CodebookUpdate, LINE)
    this.initCodebookUpdatedEventListener()
    // PVSCL:ENDCOND
    this.initAnnotationsObserver()
    // PVSCL:IFCOND(Remote, LINE)
    // TODO Check if client manager is remote
    if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager) || LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, Neo4JClientManager)) {
      this.initReloadAnnotationsEvent()
    }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ImportAnnotations, LINE)
    this.initAnnotationsImportedEventListener()
    // PVSCL:ENDCOND
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    // Destroy annotations observer
    clearInterval(this.observerInterval)
    // PVSCL:IFCOND(Remote, LINE)
    // Destroy annotations reload interval
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval)
    }
    // PVSCL:ENDCOND
    // Destroy annotations clean interval if exist
    clearInterval(this.cleanInterval)
    // PVSCL:IFCOND(UserFilter, LINE)
    // Destroy user filter
    if (this.userFilter) {
      this.userFilter.destroy()
    }
    // PVSCL:ENDCOND
  }

  // PVSCL:IFCOND(Remote, LINE)

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

  // PVSCL:ENDCOND

  /**
   * Initializes annotations observer, to ensure dynamic web pages maintain highlights on the screen
   * @param callback Callback when initialization finishes
   */
  initAnnotationsObserver (callback) {
    this.observerInterval = setInterval(() => {
      // console.debug('Observer interval')
      let annotationsToHighlight
      // PVSCL:IFCOND(UserFilter, LINE)
      annotationsToHighlight = this.currentAnnotations
      // PVSCL:ELSECOND
      annotationsToHighlight = this.allAnnotations
      // PVSCL:ENDCOND
      if (annotationsToHighlight) {
        for (let i = 0; i < this.allAnnotations.length; i++) {
          const annotation = this.allAnnotations[i]
          // Search if annotation exist
          const element = document.querySelector('[data-annotation-id="' + annotation.id + '"]')
          // If annotation doesn't exist, try to find it
          if (!_.isElement(element)) {
            Promise.resolve().then(() => { this.highlightAnnotation(annotation) })
          }
        }
      }
    }, ANNOTATION_OBSERVER_INTERVAL_IN_SECONDS * 1000)
    // TODO Improve the way to highlight to avoid this interval (when search in PDFs it is highlighted empty element instead of element)
    this.cleanInterval = setInterval(() => {
      // console.debug('Clean interval')
      const highlightedElements = document.querySelectorAll('.highlightedAnnotation')
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

  // PVSCL:IFCOND(Create, LINE)
  initAnnotationCreatedEventListener (callback) {
    this.events.annotationCreatedEvent = { element: document, event: Events.annotationCreated, handler: this.createdAnnotationHandler() }
    this.events.annotationCreatedEvent.element.addEventListener(this.events.annotationCreatedEvent.event, this.events.annotationCreatedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createdAnnotationHandler () {
    return (event) => {
      const annotation = event.detail.annotation
      // Add to all annotations list
      this.allAnnotations.push(annotation)
      // PVSCL:IFCOND(Replying, LINE)
      // If annotation is replying another annotation, add to reply annotation list
      if (annotation.references.length > 0) {
        this.replyAnnotations.push(annotation)
      }
      // PVSCL:ENDCOND
      // Dispatch annotations updated event
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, { annotations: this.allAnnotations })
      // PVSCL:IFCOND(UserFilter, LINE)
      // Enable in user filter the user who has annotated and returns if it was disabled
      this.userFilter.addFilteredUser(annotation.creator)
      // Retrieve current annotations
      this.currentAnnotations = this.retrieveCurrentAnnotations()
      LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, { currentAnnotations: this.currentAnnotations })
      // PVSCL:ENDCOND
      // Highlight annotation
      this.highlightAnnotation(annotation)
    }
  }

  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Delete, LINE)
  initAnnotationDeletedEventListener (callback) {
    this.events.annotationDeletedEvent = { element: document, event: Events.annotationDeleted, handler: this.deletedAnnotationHandler() }
    this.events.annotationDeletedEvent.element.addEventListener(this.events.annotationDeletedEvent.event, this.events.annotationDeletedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  deletedAnnotationHandler () {
    return (event) => {
      const annotation = event.detail.annotation
      // Remove annotation from allAnnotations
      _.remove(this.allAnnotations, (currentAnnotation) => {
        return currentAnnotation.id === annotation.id
      })
      // PVSCL:IFCOND(Replying, LINE)
      // Remove annotations that reply to this one (if user is the same)
      _.remove(this.allAnnotations, (currentAnnotation) => {
        return _.includes(currentAnnotation.references, (refId) => {
          return annotation.id === refId
        })
      })
      // PVSCL:ENDCOND
      // Dispatch annotations updated event
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, { annotations: this.allAnnotations })
      // PVSCL:IFCOND(UserFilter, LINE)
      // Retrieve current annotations
      this.currentAnnotations = this.retrieveCurrentAnnotations()
      LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, { currentAnnotations: this.currentAnnotations })
      // PVSCL:ENDCOND
      this.unHighlightAnnotation(annotation)
    }
  }
  // PVSCL:ENDCOND

  updateAllAnnotations (callback) {
    // Retrieve annotations for current url and group
    window.abwa.annotationServerManager.client.searchAnnotations({
      url: window.abwa.targetManager.getDocumentURIToSearchInAnnotationServer(),
      uri: window.abwa.targetManager.getDocumentURIToSaveInAnnotationServer(),
      group: window.abwa.groupSelector.currentGroup.id,
      order: 'asc'
    }, (err, annotationObjects) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Deserialize retrieved annotations
        this.allAnnotations = annotationObjects.map(annotationObject => Annotation.deserialize(annotationObject))
        // PVSCL:IFCOND(Replying, LINE)
        this.replyAnnotations = _.filter(this.allAnnotations, (annotation) => {
          return annotation.references && annotation.references.length > 0
        })
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(UserFilter, LINE)
        this.currentAnnotations = this.retrieveCurrentAnnotations()
        // PVSCL:ENDCOND
        // Redraw all annotations
        this.redrawAnnotations()
        LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, { annotations: this.allAnnotations })
        if (_.isFunction(callback)) {
          callback(null, this.allAnnotations)
        }
      }
    })
  }

  loadAnnotations (callback) {
    this.updateAllAnnotations((err) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
        // TODO Show user no able to load all annotations
        console.error('Unable to load annotations')
      } else {
        let unHiddenAnnotations
        // PVSCL:IFCOND(UserFilter, LINE)
        // Current annotations will be
        this.currentAnnotations = this.retrieveCurrentAnnotations()
        LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, { annotations: this.currentAnnotations })
        unHiddenAnnotations = this.currentAnnotations
        // PVSCL:ELSECOND
        unHiddenAnnotations = this.allAnnotations
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(Selector, LINE)
        // If annotations have a selector, are highlightable in the target
        this.highlightAnnotations(unHiddenAnnotations)
        // PVSCL:ENDCOND
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  retrieveCurrentAnnotations () {
    let currentAnnotations
    // PVSCL:IFCOND(UserFilter, LINE)
    if (this.userFilter) {
      currentAnnotations = this.retrieveAnnotationsForUsers(this.userFilter.filteredUsers)
    } else {
      currentAnnotations = this.allAnnotations
    }
    // PVSCL:ELSECOND
    currentAnnotations = this.allAnnotations
    // PVSCL:ENDCOND
    return currentAnnotations
  }

  // PVSCL:IFCOND(Selector, LINE)
  highlightAnnotations (annotations, callback) {
    const promises = []
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
    // Check if has selector to highlight, otherwise return
    if (!_.isObject(annotation.target[0].selector)) {
      if (_.isFunction(callback)) {
        callback()
      }
      return
    }
    // Check if swal is opened, it is not required to reload annotations if it is opened, and it loses the focus in a form
    if (document.querySelector('.swal2-container') === null) { // TODO Look for a better solution...
      // Get annotation color for an annotation
      let color
      // PVSCL:IFCOND(Classifying, LINE)
      // Annotation color is based on codebook color
      // Get annotated code id
      const bodyWithClassifyingPurpose = annotation.getBodyForPurpose('classifying')
      if (bodyWithClassifyingPurpose) {
        const codeOrTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(bodyWithClassifyingPurpose.value.id)
        if (codeOrTheme) {
          color = codeOrTheme.color
        } else {
          const ColorUtils = require('../../utils/ColorUtils').default
          color = ColorUtils.getDefaultColor()
        }
      } else {
        const ColorUtils = require('../../utils/ColorUtils').default
        color = ColorUtils.getDefaultColor()
      }
      // PVSCL:ELSECOND
      // Annotation color used is default in grey
      const ColorUtils = require('../../utils/ColorUtils').default
      color = ColorUtils.getDefaultColor()
      // PVSCL:ENDCOND
      // Get the tooltip text for the annotation
      const tooltip = this.generateTooltipFromAnnotation(annotation)
      // Draw the annotation in DOM
      try {
        const highlightedElements = DOMTextUtils.highlightContent({
          selectors: annotation.target[0].selector,
          className: 'highlightedAnnotation',
          id: annotation.id,
          format: window.abwa.targetManager.documentFormat
        })
        // Highlight in same color as button
        highlightedElements.forEach(highlightedElement => {
          // If need to highlight, set the color corresponding to, in other case, maintain its original color
          highlightedElement.style.backgroundColor = color
          // Set purpose color
          highlightedElement.dataset.color = color
          // Set a tooltip that is shown when user mouseover the annotation
          highlightedElement.title = tooltip
        })
        // FeatureComment: if annotation is mutable, update or delete, the mechanism is a context menu
        // PVSCL:IFCOND(Update OR Delete, LINE)
        // Create context menu event for highlighted elements
        this.createContextMenuForAnnotation(annotation)
        // PVSCL:IFCOND(Commenting, LINE)
        // Create double click event handler to comment
        this.createDoubleClickEventHandler(annotation)
        // PVSCL:ENDCOND
        // PVSCL:ENDCOND
      } catch (e) {
        // Handle error
        if (_.isFunction(callback)) {
          callback(new Error('Element not found'))
        }
      } finally {
        if (_.isFunction(callback)) {
          callback()
        }
      }
    } else {
      if (_.isFunction(callback)) {
        callback()
      }
    }
  }

  unHighlightAnnotation (annotation) {
    DOMTextUtils.unHighlightElements([...document.querySelectorAll('[data-annotation-id="' + annotation.id + '"]')])
  }

  generateTooltipFromAnnotation (annotation) {
    let tooltipString = ''
    tooltipString += 'User: ' + annotation.creator.replace(window.abwa.annotationServerManager.annotationServerMetadata.userUrl, '') + '\n'
    annotation.body.forEach((body) => {
      if (body) {
        tooltipString += body.tooltip() + '\n'
      }
    })
    return tooltipString
  }

  createContextMenuForAnnotation (annotation) {
    $.contextMenu({
      selector: '[data-annotation-id="' + annotation.id + '"]',
      build: () => {
        // Create items for context menu
        const items = {}
        // If current user is the same as author, allow to remove annotation or add a comment
        if (annotation.creator === window.abwa.groupSelector.getCreatorData()) {
          // Check if somebody has replied
          // PVSCL:IFCOND(Replying, LINE)
          if (ReplyAnnotation.hasReplies(annotation, this.replyAnnotations)) {
            items.reply = { name: 'Reply' }
          } else {
            // PVSCL:IFCOND(Commenting, LINE)
            items.comment = { name: 'Comment' }
            // PVSCL:ENDCOND
          }
          // PVSCL:ELSEIFCOND(Commenting, LINE)
          items.comment = { name: 'Comment' }
          // PVSCL:ENDCOND
          items.delete = { name: 'Delete' }
        } else {
          // PVSCL:IFCOND(Replying, LINE)
          items.reply = { name: 'Reply' }
          // PVSCL:ELSECOND
          // Currently there is nothing to do
          // PVSCL:ENDCOND
        }
        return {
          callback: (key, opt) => {
            if (key === 'delete') {
              LanguageUtils.dispatchCustomEvent(Events.deleteAnnotation, {
                annotation: annotation
              })
            }/* PVSCL:IFCOND(Replying) */ else if (key === 'reply') {
              // Update your last reply if exists, otherwise create a new reply
              const replies = ReplyAnnotation.getReplies(annotation, this.replyAnnotations)
              // Get last reply and check if it is current user's annotation or not
              const lastReply = _.last(replies)
              if (lastReply && lastReply.creator === window.abwa.groupSelector.getCreatorData()) {
                // Annotation to be updated is the reply
                const replyData = ReplyAnnotation.createRepliesData(annotation, this.replyAnnotations)
                const repliesHtml = replyData.htmlText
                CommentingForm.showCommentingForm(lastReply, (err, replyAnnotation) => {
                  if (err) {
                    // Show error
                    Alerts.errorAlert({ text: 'Unexpected error when updating reply. Please reload webpage and try again. Error: ' + err.message })
                  } else {
                    LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
                      annotation: replyAnnotation
                    })
                  }
                }, repliesHtml)
              } else {
                // Annotation to be created is new and replies the previous one
                // Create target for new reply annotation
                const target = [{ source: annotation.target[0].source }]
                const replyAnnotation = new Annotation({ target: target, references: [annotation.id] })
                const replyData = ReplyAnnotation.createRepliesData(annotation, this.replyAnnotations)
                const repliesHtml = replyData.htmlText
                CommentingForm.showCommentingForm(replyAnnotation, (err, replyAnnotation) => {
                  if (err) {
                    // Show error
                    Alerts.errorAlert({ text: 'Unexpected error when updating reply. Please reload webpage and try again. Error: ' + err.message })
                  } else {
                    LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                      purpose: 'replying',
                      replyingAnnotation: replyAnnotation,
                      repliedAnnotation: annotation
                    })
                  }
                }, repliesHtml)
              }
            }/* PVSCL:ENDCOND *//* PVSCL:IFCOND(Commenting) */ else if (key === 'comment') {
              // Open commenting form
              this.openCommentingForm(annotation)
            } /* PVSCL:ENDCOND */
          },
          items: items
        }
      }
    })
  }

  // PVSCL:IFCOND(Commenting, LINE)
  openCommentingForm (annotation) {
    CommentingForm.showCommentingForm(annotation, (err, annotation) => {
      if (err) {
        Alerts.errorAlert({ text: 'Unexpected error when commenting. Please reload webpage and try again. Error: ' + err.message })
      } else {
        LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
          annotation: annotation
        })
      }
    })
  }

  // PVSCL:ENDCOND

  redrawAnnotations (callback) {
    if (document.querySelector('.swal2-container') === null) { // TODO Look for a better solution...
      // Unhighlight all annotations
      this.unHighlightAllAnnotations()
      // Highlight all annotations
      // PVSCL:IFCOND(UserFilter, LINE)
      this.highlightAnnotations(this.currentAnnotations, callback)
      // PVSCL:ELSECOND
      this.highlightAnnotations(this.allAnnotations)
      // PVSCL:ENDCOND
    }
  }

  unHighlightAllAnnotations () {
    // Remove created annotations
    const highlightedElements = [...document.querySelectorAll('[data-annotation-id]')]
    DOMTextUtils.unHighlightElements(highlightedElements)
  }

  createDoubleClickEventHandler (annotation) {
    const highlights = document.querySelectorAll('[data-annotation-id="' + annotation.id + '"]')
    for (let i = 0; i < highlights.length; i++) {
      const highlight = highlights[i]
      highlight.addEventListener('dblclick', () => {
        this.openCommentingForm(annotation)
      })
    }
  }

  // PVSCL:ENDCOND
  // PVSCL:IFCOND(UserFilter, LINE)
  initUserFilter () {
    // Create augmentation operations for the current group
    this.userFilter = new UserFilter()
    this.userFilter.init()
  }

  initUserFilterChangeEvent (callback) {
    this.events.userFilterChangeEvent = { element: document, event: Events.userFilterChange, handler: this.createUserFilterChangeEventHandler() }
    this.events.userFilterChangeEvent.element.addEventListener(this.events.userFilterChangeEvent.event, this.events.userFilterChangeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createUserFilterChangeEventHandler () {
    return (event) => {
      // Retrieve filtered users list from event
      const filteredUsers = event.detail.filteredUsers
      // Retrieve annotations for filtered users
      this.currentAnnotations = this.retrieveAnnotationsForUsers(filteredUsers)
      this.redrawAnnotations()
      // Updated current annotations due to changes in the filtered users
      LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, { currentAnnotations: this.currentAnnotations })
    }
  }

  /**
   * Retrieve from all annotations for the current document, those who user is one of the list in users
   * @param users
   * @returns {Array}
   */
  retrieveAnnotationsForUsers (users) {
    return _.filter(this.allAnnotations, (annotation) => {
      return _.find(users, (user) => {
        return annotation.creator === user
      })
    })
  }

  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Update, LINE)
  initAnnotationUpdatedEventListener (callback) {
    this.events.annotationUpdatedEvent = { element: document, event: Events.annotationUpdated, handler: this.updatedAnnotationHandler() }
    this.events.annotationUpdatedEvent.element.addEventListener(this.events.annotationUpdatedEvent.event, this.events.annotationUpdatedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  updatedAnnotationHandler () {
    return (event) => {
      // Get updated annotation
      const annotation = event.detail.annotation
      // Update all annotations
      const allIndex = _.findIndex(this.allAnnotations, (currentAnnotation) => {
        return annotation.id === currentAnnotation.id
      })
      this.allAnnotations.splice(allIndex, 1, annotation)
      // Dispatch annotations updated event
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, { annotations: this.allAnnotations })
      // PVSCL:IFCOND(UserFilter, LINE)
      // Retrieve current annotations
      this.currentAnnotations = this.retrieveCurrentAnnotations()
      LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, { currentAnnotations: this.currentAnnotations })
      // PVSCL:ENDCOND

      // Unhighlight and highlight annotation
      this.unHighlightAnnotation(annotation)
      this.highlightAnnotation(annotation)
    }
  }

  // PVSCL:ENDCOND
  // PVSCL:IFCOND(DeleteAll, LINE)
  initAllAnnotationsDeletedEventListener (callback) {
    this.events.allAnnotationsDeletecEvent = { element: document, event: Events.deletedAllAnnotations, handler: this.allAnnotationsDeletedEventListener() }
    this.events.allAnnotationsDeletecEvent.element.addEventListener(this.events.allAnnotationsDeletecEvent.event, this.events.allAnnotationsDeletecEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  allAnnotationsDeletedEventListener () {
    return (event) => {
      const annotations = event.detail.annotations
      // Remove deleted annotations from allAnnotations
      _.pullAllWith(this.allAnnotations, annotations, (a, b) => { return a.id === b.id })
      // Dispatch annotations updated event
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, { annotations: this.allAnnotations })
      // PVSCL:IFCOND(UserFilter, LINE)
      // Retrieve current annotations
      this.currentAnnotations = this.retrieveCurrentAnnotations()
      LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, { currentAnnotations: this.currentAnnotations })
      // PVSCL:ENDCOND
      // Wait til swal gets hidden and delete all annotations from DOM
      setTimeout(() => {
        // Unhighlight deleted annotations
        this.redrawAnnotations()
      }, 1000)
    }
  }
  // PVSCL:ENDCOND

  // PVSCL:IFCOND(ImportAnnotations, LINE)
  initAnnotationsImportedEventListener (callback) {
    this.events.annotationsImportedEvent = { element: document, event: Events.annotationsImported, handler: this.createAnnotationsImportedEventHandler() }
    this.events.annotationsImportedEvent.element.addEventListener(this.events.annotationsImportedEvent.event, this.events.annotationsImportedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createAnnotationsImportedEventHandler () {
    return (e) => {
      // Reload annotations

    }
  }

  // PVSCL:ENDCOND
  // PVSCL:IFCOND(CodebookUpdate, LINE)
  initCodebookUpdatedEventListener (callback) {
    this.events.codebookUpdated = { element: document, event: Events.codebookUpdated, handler: this.createCodebookUpdatedEventHandler() }
    this.events.codebookUpdated.element.addEventListener(this.events.codebookUpdated.event, this.events.codebookUpdated.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createCodebookUpdatedEventHandler () {
    return () => {
      // Reload annotations
      this.updateAllAnnotations(() => {
        console.debug('annotations updated')
      })
    }
  }
  // PVSCL:ENDCOND
}

export default ReadAnnotation
