const DOMTextUtils = require('../../utils/DOMTextUtils')
// TODO const PDFTextUtils = require('../../utils/PDFTextUtils')
const LanguageUtils = require('../../utils/LanguageUtils')
const Events = require('../../Events')
const _ = require('lodash')
const UserFilter = require('./UserFilter')
const $ = require('jquery')
require('jquery-contextmenu/dist/jquery.contextMenu')
const CommentingForm = require('../purposes/CommentingForm')

class ReadAnnotation {
  constructor () {
    this.events = {}
  }

  init () {
    // Event listener created annotation
    this.initAnnotationCreatedEventListener()
    // Event listener deleted annotation
    this.initAnnotationDeletedEventListener()
    // Event listener updated annotation
    this.initAnnotationUpdatedEventListener()
    this.loadAnnotations()
    // PVSCL:IFCOND(UserFilter, LINE)
    this.initUserFilter()
    this.initUserFilterChangeEvent()
    // PVSCL:ENDCOND
  }

  // PVSCL:IFCOND(Create, LINE)
  initAnnotationCreatedEventListener (callback) {
    this.events.annotationCreatedEvent = {element: document, event: Events.annotationCreated, handler: this.createdAnnotationHandler()}
    this.events.annotationCreatedEvent.element.addEventListener(this.events.annotationCreatedEvent.event, this.events.annotationCreatedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createdAnnotationHandler () {
    return (event) => {
      let annotation = event.detail.annotation
      // Add to all annotations list
      this.allAnnotations.push(annotation)
      // Dispatch annotations updated event
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
      // PVSCL:IFCOND(UserFilter, LINE)
      // Enable in user filter the user who has annotated and returns if it was disabled
      this.userFilter.addFilteredUser(annotation.user)
      // Retrieve current annotations
      this.currentAnnotations = this.retrieveCurrentAnnotations()
      LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, {currentAnnotations: this.currentAnnotations})
      // PVSCL:ENDCOND
      // Highlight annotation
      this.highlightAnnotation(annotation)
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Delete, LINE)
  initAnnotationDeletedEventListener (callback) {
    this.events.annotationDeletedEvent = {element: document, event: Events.annotationDeleted, handler: this.deletedAnnotationHandler()}
    this.events.annotationDeletedEvent.element.addEventListener(this.events.annotationDeletedEvent.event, this.events.annotationDeletedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  deletedAnnotationHandler () {
    return (event) => {
      let annotation = event.detail.annotation
      // Remove annotation from allAnnotations
      _.remove(this.allAnnotations, (currentAnnotation) => {
        return currentAnnotation.id === annotation.id
      })
      // Dispatch annotations updated event
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
      // PVSCL:IFCOND(UserFilter, LINE)
      // Retrieve current annotations
      this.currentAnnotations = this.retrieveCurrentAnnotations()
      LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, {currentAnnotations: this.currentAnnotations})
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
        // PVSCL:IFCOND( Reply, LINE )
        this.replyAnnotations = _.filter(annotations, (annotation) => {
          return annotation.references && annotation.references.length > 0
        })
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(UserFilter, LINE)
        this.currentAnnotations = this.retrieveCurrentAnnotations()
        // PVSCL:ENDCOND
        // Redraw all annotations
        this.redrawAnnotations()
        LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
        if (_.isFunction(callback)) {
          callback(null, this.allAnnotations)
        }
      }
    })
  }

  loadAnnotations (callback) {
    this.updateAllAnnotations((err) => {
      if (err) {
        // TODO Show user no able to load all annotations
        console.error('Unable to load annotations')
      } else {
        let unHiddenAnnotations
        // PVSCL:IFCOND(UserFilter, LINE)
        // Current annotations will be
        this.currentAnnotations = this.retrieveCurrentAnnotations()
        LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, {annotations: this.currentAnnotations})
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
    // Get annotation color for an annotation
    let color
    // PVSCL:IFCOND(Classifying, LINE)
    // Annotation color is based on codebook color
    // Get annotated code id
    let bodyWithClassifyingPurpose = _.find(annotation.body, (body) => { return body.purpose === 'classifying' })
    let codeOrTheme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(bodyWithClassifyingPurpose.id)
    color = codeOrTheme.color
    // PVSCL:ELSECOND
    // Annotation color used is default in grey
    const ColorUtils = require('../../utils/ColorUtils')
    color = ColorUtils.getDefaultColor()
    // PVSCL:ENDCOND
    // Get the tooltip text for the annotation
    // let tooltip = this.generateTooltipFromAnnotation()
    // Draw the annotation in DOM
    try {
      let highlightedElements = DOMTextUtils.highlightContent(
        annotation.target[0].selector, 'highlightedAnnotation', annotation.id)
      // Highlight in same color as button
      highlightedElements.forEach(highlightedElement => {
        // If need to highlight, set the color corresponding to, in other case, maintain its original color
        highlightedElement.style.backgroundColor = color
        // Set purpose color
        highlightedElement.dataset.color = color
        // TODO More things
      })
      // FeatureComment: if annotation is mutable, update or delete, the mechanism is a context menu
      // PVSCL:IFCOND(Update OR Delete)
      // Create context menu event for highlighted elements
      this.createContextMenuForAnnotation(annotation)
      // PVSCL:ENDCOND
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

  unHighlightAnnotation (annotation) {
    DOMTextUtils.unHighlightElements([...document.querySelectorAll('[data-annotation-id="' + annotation.id + '"]')])
  }

  createContextMenuForAnnotation (annotation) {
    $.contextMenu({
      selector: '[data-annotation-id="' + annotation.id + '"]',
      build: () => {
        // Create items for context menu
        let items = {}
        // If current user is the same as author, allow to remove annotation or add a comment
        if (annotation.user === window.abwa.groupSelector.user.userid) {
          // Check if somebody has replied
          // PVSCL:IFCOND(Replying, LINE)
          /* if (ReplyAnnotation.hasReplies(annotation, this.replyAnnotations)) {
          if (ReplyAnnotation.hasReplies(annotation, this.replyAnnotations)) {
            items['reply'] = {name: 'Reply'}
          } else {
            // PVSCL:IFCOND(Comment, LINE)
            items['comment'] = {name: 'Comment'}
            // PVSCL:ENDCOND
          } */
          // PVSCL:ELSEIFCOND(Commenting, LINE)
          items['comment'] = {name: 'Comment'}
          // PVSCL:ENDCOND
          items['delete'] = {name: 'Delete'}
        } else {
          // PVSCL:IFCOND(Replying, LINE)
          items['reply'] = {name: 'Reply'}
          // PVSCL:ENDCOND
          // PVSCL:IFCOND(Assessing, LINE)
          items['assessing'] = {name: 'assessing'}
          // PVSCL:ENDCOND
          // If current user is the same as annotation author, allow remove
          // PVSCL:IFCOND(Delete, LINE)
          items['delete'] = {name: 'Delete'}
          // PVSCL:ENDCOND
        }
        return {
          callback: (key, opt) => {
            if (key === 'delete') {
              LanguageUtils.dispatchCustomEvent(Events.deleteAnnotation, {
                annotation: annotation
              })
            }/* PVSCL:IFCOND(Replying) */ else if (key === 'replying') {
              // TODO Update your last reply if exists, otherwise create a new reply
              let lastReplyIsYours
              if (lastReplyIsYours) {
                // Annotation to be updated is the reply
                LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
                  purpose: 'commenting',
                  annotation: annotation
                })
              } else {
                LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                  purpose: 'replying',
                  replyingAnnotation: annotation
                })
              }
            }/* PVSCL:ENDCOND *//* PVSCL:IFCOND(Assessing) */ else if (key === 'assessing') {
              // TODO If you have validated already, update your annotation
              // TODO If you didn't validate, create a replying annotation to validate
            }/* PVSCL:ENDCOND *//* PVSCL:IFCOND(Commenting) */ else if (key === 'comment') {
              // Open commenting form
              CommentingForm.showCommentingForm(annotation)
              // PVSCL:ENDCOND
            }
          },
          items: items
        }
      }
    })
  }

  redrawAnnotations (callback) {
    // Unhighlight all annotations
    this.unHighlightAllAnnotations()
    // Highlight all annotations
    // PVSCL:IFCOND(UserFilter, LINE)
    this.highlightAnnotations(this.currentAnnotations, callback)
    // PVSCL:ELSECOND
    this.highlightAnnotations(this.allAnnotations)
    // PVSCL:ENDCOND
  }

  unHighlightAllAnnotations () {
    // Remove created annotations
    let highlightedElements = [...document.querySelectorAll('[data-annotation-id]')]
    DOMTextUtils.unHighlightElements(highlightedElements)
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
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(UserFilter, LINE)

  initUserFilter () {
    // Create augmentation operations for the current group
    this.userFilter = new UserFilter()
    this.userFilter.init()
  }

  initUserFilterChangeEvent (callback) {
    this.events.userFilterChangeEvent = {element: document, event: Events.userFilterChange, handler: this.createUserFilterChangeEventHandler()}
    this.events.userFilterChangeEvent.element.addEventListener(this.events.userFilterChangeEvent.event, this.events.userFilterChangeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createUserFilterChangeEventHandler () {
    return (event) => {
      // Retrieve filtered users list from event
      let filteredUsers = event.detail.filteredUsers
      // Retrieve annotations for filtered users
      this.currentAnnotations = this.retrieveAnnotationsForUsers(filteredUsers)
      this.redrawAnnotations()
      // Updated current annotations due to changes in the filtered users
      LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, {currentAnnotations: this.currentAnnotations})
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
        return annotation.user === user
      })
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Update, LINE)
  initAnnotationUpdatedEventListener (callback) {
    this.events.annotationUpdatedEvent = {element: document, event: Events.annotationUpdated, handler: this.updatedAnnotationHandler()}
    this.events.annotationUpdatedEvent.element.addEventListener(this.events.annotationUpdatedEvent.event, this.events.annotationUpdatedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  updatedAnnotationHandler () {
    return (event) => {
      // Get updated annotation
      let annotation = event.detail.annotation
      // Update all annotations
      let allIndex = _.findIndex(this.allAnnotations, (currentAnnotation) => {
        return annotation.id === currentAnnotation.id
      })
      this.allAnnotations.splice(allIndex, 1, annotation)
      // Dispatch annotations updated event
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})

      // PVSCL:IFCOND(UserFilter, LINE)
      // Retrieve current annotations
      this.currentAnnotations = this.retrieveCurrentAnnotations()
      LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, {currentAnnotations: this.currentAnnotations})
      // PVSCL:ENDCOND

      // Unhighlight and highlight annotation
      this.unHighlightAnnotation(annotation)
      this.highlightAnnotation(annotation)
    }
  }
  // PVSCL:ENDCOND
}

module.exports = ReadAnnotation
