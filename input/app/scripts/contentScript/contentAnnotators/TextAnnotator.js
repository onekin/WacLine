const ContentAnnotator = require('./ContentAnnotator')
const PDF = require('../../target/formats/PDF')
const Config = require('../../Config')
const Events = require('../Events')
const DOMTextUtils = require('../../utils/DOMTextUtils')
const PDFTextUtils = require('../../utils/PDFTextUtils')
const LanguageUtils = require('../../utils/LanguageUtils')
const $ = require('jquery')
require('jquery-contextmenu/dist/jquery.contextMenu')
const _ = require('lodash')
require('components-jqueryui')
const Alerts = require('../../utils/Alerts')
const Theme = require('../../coodebook/Theme')
// PVSCL:IFCOND(Code,LINE)
const Code = require('../../coodebook/Code')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Hypothesis,LINE)
const HypothesisClientManager = require('../../annotationServer/hypothesis/HypothesisClientManager')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Reply,LINE)
const ReplyAnnotation = require('../../production/ReplyAnnotation')
// PVSCL:ENDCOND
// PVSCL:IFCOND(SentimentAnalysis,LINE)
const axios = require('axios')
const qs = require('qs')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Autofill,LINE)
const Awesomplete = require('awesomplete')
// PVSCL:ENDCOND
const ANNOTATION_OBSERVER_INTERVAL_IN_SECONDS = 3
const ANNOTATIONS_UPDATE_INTERVAL_IN_SECONDS = 60

class TextAnnotator extends ContentAnnotator {
  constructor (config) {
    super()
    this.events = {}
    this.config = config
    this.observerInterval = null
    this.reloadInterval = null
    // PVSCL:IFCOND(UserFilter, LINE)
    this.currentAnnotations = null
    // PVSCL:ENDCOND
    this.allAnnotations = null
    this.highlightClassName = 'highlightedAnnotation'
  }

  init (callback) {
    console.debug('Initializing TextAnnotator')
    this.initEvents(() => {
      // Retrieve current user profile
      this.loadAnnotations(() => {
        console.debug('Initialized TextAnnotator')
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
                // PVSCL:IFCOND(UserFilter, LINE)
                this.initUserFilterChangeEvent(() => {
                  // Reload annotations periodically
                  if (_.isFunction(callback)) {
                    callback()
                  }
                })
                // PVSCL:ELSECOND
                // Reload annotations periodically
                if (_.isFunction(callback)) {
                  callback()
                }
                // PVSCL:ENDCOND
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
    // PVSCL:IFCOND(DeleteGroup,LINE)
    this.events.deleteAllAnnotationsEvent = {element: document, event: Events.deleteAllAnnotations, handler: this.createDeleteAllAnnotationsEventHandler()}
    this.events.deleteAllAnnotationsEvent.element.addEventListener(this.events.deleteAllAnnotationsEvent.event, this.events.deleteAllAnnotationsEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
    // PVSCL:ELSECOND
    if (_.isFunction(callback)) {
      callback()
    }
    // PVSCL:ENDCOND
  }

  initTagsUpdatedEvent (callback) {
    this.events.tagsUpdated = {element: document, event: Events.tagsUpdated, handler: this.createTagsUpdatedEventHandler()}
    this.events.tagsUpdated.element.addEventListener(this.events.tagsUpdated.event, this.events.tagsUpdated.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createTagsUpdatedEventHandler (callback) {
    return () => {
      this.updateAllAnnotations(() => {
        console.debug('Updated all the annotations after Tags Updated event')
      })
    }
  }
  // PVSCL:IFCOND(UserFilter, LINE)

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
  // PVSCL:IFCOND(DeleteGroup,LINE)

  createDeleteAllAnnotationsEventHandler (callback) {
    return () => {
      this.deleteAllAnnotations(() => {
        console.debug('All annotations deleted')
      })
    }
  }
  // PVSCL:ENDCOND

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
    let _this = this
    return (event) => {
      let selectors = []
      // PVSCL:IFCOND(SingleCode, LINE)
      // Get the currently annotatedCode to do comprobations
      let lastAnnotatedCode = event.detail.lastAnnotatedCode
      // Get the code or theme of the selected button
      let codeOrTheme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(event.detail.id)
      // PVSCL:ENDCOND
      // If selection is empty, return null
      if (document.getSelection().toString().length === 0) {
        // PVSCL:IFCOND(SingleCode, LINE)
        // If the button has been click to set code (changingCodesOrThemes = true)
        let changingCodesOrThemes = false
        if (LanguageUtils.isInstanceOf(codeOrTheme, Code) && lastAnnotatedCode) {
          let annotatedTheme = window.abwa.annotatedContentManager.getAnnotatedThemeOrCodeFromThemeOrCodeId(codeOrTheme.theme.id)
          if (lastAnnotatedCode.code.id !== codeOrTheme.id || annotatedTheme.hasAnnotations()) {
            changingCodesOrThemes = true
          }
        }
        // PVSCL:ENDCOND
        // Get all the annotations that pertains to clicked button in the sidebar (selected code)
        let annotatedThemeOrCodeAnnotations = window.abwa.annotatedContentManager.getAnnotationsDoneWithThemeOrCodeId(event.detail.id)
        // Calculate which one is the annotation to go to
        if (annotatedThemeOrCodeAnnotations.length > 0) {
          let index = _.indexOf(annotatedThemeOrCodeAnnotations, _this.lastAnnotation)
          if (index === -1 || index === annotatedThemeOrCodeAnnotations.length - 1) {
            _this.lastAnnotation = annotatedThemeOrCodeAnnotations[0]
          } else {
            _this.lastAnnotation = annotatedThemeOrCodeAnnotations[index + 1]
          }
        }
        // If there are no annotation to go to, just show a message
        if (annotatedThemeOrCodeAnnotations.length === 0) {
          // If there are not annotations to navigate to, show a message of empty current selection
          Alerts.infoAlert({text: chrome.i18n.getMessage('CurrentSelectionEmpty')})
          return
        }/* PVSCL:IFCOND(SingleCode) */ else if (!changingCodesOrThemes) {
          // If single code is selected, there is another event handler which will modify all the annotations for the given theme to the selected code, nothing to do here
        }/* PVSCL:ENDCOND */ else {
          // Go to calculated last annotation
          this.goToAnnotation(_this.lastAnnotation)
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
      if (_.findIndex(window.abwa.targetManager.documentFormat.selectors, (elem) => { return elem === 'FragmentSelector' }) !== -1) {
        let fragmentSelector = null
        if (window.abwa.targetManager.documentFormat === PDF) {
          fragmentSelector = PDFTextUtils.getFragmentSelector(range)
        } else {
          fragmentSelector = DOMTextUtils.getFragmentSelector(range)
        }
        if (fragmentSelector) {
          selectors.push(fragmentSelector)
        }
      }
      // Create RangeSelector
      if (_.findIndex(window.abwa.targetManager.documentFormat.selectors, (elem) => { return elem === 'RangeSelector' }) !== -1) {
        let rangeSelector = DOMTextUtils.getRangeSelector(range)
        if (rangeSelector) {
          selectors.push(rangeSelector)
        }
      }
      // Create TextPositionSelector
      if (_.findIndex(window.abwa.targetManager.documentFormat.selectors, (elem) => { return elem === 'TextPositionSelector' }) !== -1) {
        let rootElement = window.abwa.targetManager.getDocumentRootElement()
        let textPositionSelector = DOMTextUtils.getTextPositionSelector(range, rootElement)
        if (textPositionSelector) {
          selectors.push(textPositionSelector)
        }
      }
      // Create TextQuoteSelector
      if (_.findIndex(window.abwa.targetManager.documentFormat.selectors, (elem) => { return elem === 'TextQuoteSelector' }) !== -1) {
        let textQuoteSelector = DOMTextUtils.getTextQuoteSelector(range)
        if (textQuoteSelector) {
          selectors.push(textQuoteSelector)
        }
      }
      // Construct the annotation to send to hypothesis
      let annotation = TextAnnotator.constructAnnotation({selectors, tags: event.detail.tags, tagId: event.detail.id})
      window.abwa.annotationServerManager.client.createNewAnnotation(annotation, (err, annotation) => {
        if (err) {
          Alerts.errorAlert({text: 'Unexpected error, unable to create annotation'})
        } else {
          // PVSCL:IFCOND(UserFilter, LINE)
          // Enable in user filter the user who has annotated and returns if it was disabled
          let wasDisabledInUserFilter = window.abwa.userFilter.addFilteredUser(annotation.user)
          // Add to annotations
          // PVSCL:ENDCOND
          this.allAnnotations.push(annotation)
          LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
          // PVSCL:IFCOND(UserFilter, LINE)
          // Retrieve current annotations
          this.currentAnnotations = this.retrieveCurrentAnnotations()
          LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, {currentAnnotations: this.currentAnnotations})
          // PVSCL:ENDCOND
          // Send event annotation is created
          // PVSCL:IFCOND(SingleCode, LINE)
          // Check if is necesary to do a codeToAll after the annotation is created
          let codeToAll = false
          if (LanguageUtils.isInstanceOf(codeOrTheme, Code) && lastAnnotatedCode) {
            if (lastAnnotatedCode.code.id !== codeOrTheme.id) {
              codeToAll = true
            }
          }
          // PVSCL:ENDCOND
          let eventDetails = {annotation: annotation}
          // PVSCL:IFCOND(SingleCode, LINE)
          eventDetails['codeToAll'] = codeToAll
          eventDetails['lastAnnotatedCode'] = lastAnnotatedCode
          // PVSCL:ENDCOND
          LanguageUtils.dispatchCustomEvent(Events.annotationCreated, eventDetails)
          console.debug('Created annotation with ID: ' + annotation.id)
          // PVSCL:IFCOND(UserFilter, LINE)
          if (wasDisabledInUserFilter) {
            this.redrawAnnotations()
          } else {
            this.highlightAnnotation(annotation)
          }
          // PVSCL:ELSECOND
          // Highlight annotation
          this.highlightAnnotation(annotation)
          // PVSCL:ENDCOND
          window.getSelection().removeAllRanges()
        }
      })
    }
  }

  static constructAnnotation ({selectors, tags = [], tagId, motivation = Config.namespace + ':classifying', target}) {
    let data = {
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      group: window.abwa.groupSelector.currentGroup.id,
      creator: window.abwa.groupSelector.getCreatorData() || window.abwa.groupSelector.user.userid,
      document: {},
      permissions: {
        read: ['group:' + window.abwa.groupSelector.currentGroup.id]
      },
      references: [],
      // PVSCL:IFCOND(SuggestedLiterature,LINE)
      suggestedLiterature: [],
      // PVSCL:ENDCOND
      motivation: motivation,
      tags: tags,
      target: target || [{
        selector: selectors
      }],
      text: '',
      uri: window.abwa.targetManager.getDocumentURIToSaveInAnnotationServer()
    }
    // Tag id
    if (tagId) {
      data.tagId = tagId
      data.body = window.abwa.annotationServerManager.annotationServerMetadata.annotationUrl + tagId
    }
    // PVSCL:IFCOND(Hypothesis, LINE)
    // As hypothes.is don't follow some attributes of W3C, we must adapt created annotation with its own attributes to set the target source
    if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager)) {
      // Add uri attribute
      data.uri = window.abwa.targetManager.getDocumentURIToSaveInAnnotationServer()
      // Add document, uris, title, etc.
      let uris = window.abwa.targetManager.getDocumentURIs()
      data.document = {}
      if (uris.urn) {
        data.document.documentFingerprint = uris.urn
      }
      data.document.link = Object.values(uris).map(uri => { return {href: uri} })
      if (uris.doi) {
        data.document.dc = { identifier: [uris.doi] }
        data.document.highwire = { doi: [uris.doi] }
      }
      // If document title is retrieved
      if (_.isString(window.abwa.targetManager.documentTitle)) {
        data.document.title = window.abwa.targetManager.documentTitle
      }
      // Copy to metadata field because hypothes.is doesn't return from its API all the data that it is placed in document
      data.documentMetadata = data.document
    }
    // PVSCL:ENDCOND
    let source = window.abwa.targetManager.getDocumentURIs()
    // Get document title
    source['title'] = window.abwa.targetManager.documentTitle || ''
    // Get UUID for current target
    source['id'] = window.abwa.targetManager.getDocumentId()
    data.target[0].source = source // Add source to the target
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
      // console.debug('Observer interval')
      // If a swal is displayed, do not execute highlighting observer
      if (document.querySelector('.swal2-container') === null) { // TODO Look for a better solution...
        let annotationsToHighlight
        // PVSCL:IFCOND(UserFilter, LINE)
        annotationsToHighlight = this.currentAnnotations
        // PVSCL:ELSECOND
        annotationsToHighlight = this.allAnnotations
        // PVSCL:ENDCOND
        if (annotationsToHighlight) {
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
      // console.debug('Clean interval')
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
        // PVSCL:IFCOND(UserFilter, LINE)
        // Current annotations will be
        this.currentAnnotations = this.retrieveCurrentAnnotations()
        LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, {annotations: this.currentAnnotations})
        // Highlight annotations in the DOM
        this.highlightAnnotations(this.currentAnnotations)
        // PVSCL:ELSECOND
        // Current annotations will be
        this.allAnnotations = this.retrieveCurrentAnnotations()
        LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
        // Highlight annotations in the DOM
        this.highlightAnnotations(this.allAnnotations)
        // PVSCL:ENDCOND
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

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

  retrieveCurrentAnnotations () {
    let currentAnnotations
    // PVSCL:IFCOND(UserFilter, LINE)
    if (window.abwa.userFilter) {
      currentAnnotations = this.retrieveAnnotationsForUsers(window.abwa.userFilter.filteredUsers)
    } else {
      currentAnnotations = this.allAnnotations
    }
    // PVSCL:ELSECOND
    currentAnnotations = this.allAnnotations
    // PVSCL:ENDCOND
    return currentAnnotations
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
          // PVSCL:IFCOND(ToolTip, LINE)
          if (LanguageUtils.isInstanceOf(tag, Theme)) {
            // Set message
            highlightedElement.title = tag.name
          } /* PVSCL:IFCOND(Code) */ else if (LanguageUtils.isInstanceOf(tag, Code)) {
            highlightedElement.title = tag.theme.name + '\nCode: ' + tag.name
          } /* PVSCL:ENDCOND */
          // PVSCL:IFCOND(GSheetProvider, LINE)
          let user = annotation.user.replace('acct:', '').replace('@hypothes.is', '')
          highlightedElement.title += '\nAuthor: ' + user
          // PVSCL:ENDCOND
          if (!_.isEmpty(annotation.text)) {
            try {
              let feedback = JSON.parse(annotation.text)
              highlightedElement.title += '\nComment: ' + feedback.comment
            } catch (e) {
              highlightedElement.title += '\nComment: ' + annotation.text
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
        if (annotation.user === window.abwa.groupSelector.user.userid) {
          // Check if somebody has replied
          // PVSCL:IFCOND(Reply, LINE)
          if (ReplyAnnotation.hasReplies(annotation, this.replyAnnotations)) {
            items['reply'] = {name: 'Reply'}
          } else {
            // PVSCL:IFCOND(Comment, LINE)
            items['comment'] = {name: 'Comment'}
            // PVSCL:ENDCOND
          }
          // PVSCL:ELSEIFCOND(Comment, LINE)
          items['comment'] = {name: 'Comment'}
          // PVSCL:ENDCOND
          items['delete'] = {name: 'Delete'}
        } else {
          // PVSCL:IFCOND(Reply, LINE)
          items['reply'] = {name: 'Reply'}
          // PVSCL:ENDCOND
          // PVSCL:IFCOND(Validate, LINE)
          items['validate'] = {name: 'Validate'}
          // PVSCL:ENDCOND
        }
        return {
          callback: (key, opt) => {
            if (key === 'delete') {
              this.deleteAnnotationHandler(annotation)
            }/* PVSCL:IFCOND(Comment) */ else if (key === 'comment') {
              this.commentAnnotationHandler(annotation)
            }/* PVSCL:ENDCONDPVSCL:IFCOND(Reply) */ else if (key === 'reply') {
              this.replyAnnotationHandler(annotation)
            }/* PVSCL:ENDCONDPVSCL:IFCOND(Validate) */ else if (key === 'validate') {
              this.validateAnnotationHandler(annotation)
            }/* PVSCL:ENDCOND */
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
        window.abwa.annotationServerManager.client.deleteAnnotation(annotation.id, (err, result) => {
          if (err) {
            // Unable to delete this annotation
            console.error('Error while trying to delete annotation %s', annotation.id)
          } else {
            if (!result.deleted) {
              // Alert user error happened
              Alerts.errorAlert({text: chrome.i18n.getMessage('errorDeletingHypothesisAnnotation')})
            } else {
              // PVSCL:IFCOND(UserFilter, LINE)
              // Remove annotation from data model
              _.remove(this.currentAnnotations, (currentAnnotation) => {
                return currentAnnotation.id === annotation.id
              })
              LanguageUtils.dispatchCustomEvent(Events.updatedCurrentAnnotations, {currentAnnotations: this.currentAnnotations})
              // PVSCL:ENDCOND
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
  // PVSCL:IFCOND(Reply,LINE)

  replyAnnotationHandler (annotation) {
    ReplyAnnotation.replyAnnotation(annotation)
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Validate,LINE)

  validateAnnotationHandler (annotation) {
    ReplyAnnotation.validateAnnotation(annotation)
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Comment,LINE)

  /**
   * Generates the HTML for comment form based on annotation, add reference autofill,...
   * @param annotation
   * @param showForm
   * @param sidebarOpen
   * @returns {Object}
   */
  generateCommentForm ({annotation, showForm, sidebarOpen, themeOrCode, previousAssignmentsUI}) {
    let html = ''
    // PVSCL:IFCOND(PreviousAssignments,LINE)
    html += previousAssignmentsUI.outerHTML
    // PVSCL:ENDCOND
    html += '<textarea class="swal2-textarea" data-minchars="1" data-multiple id="comment" rows="6" autofocus>' + annotation.text + '</textarea>'
    // PVSCL:IFCOND(SuggestedLiterature,LINE)
    let suggestedLiteratureHtml = (lit) => {
      let html = ''
      lit.forEach((i) => {
        html += '<li><a class="removeReference"></a><span title="' + lit[i] + '">' + lit[i] + '</span></li>'
      })
      return html
    }
    html += '<input placeholder="Suggest literature from DBLP" id="swal-input1" class="swal2-input"><ul id="literatureList">' + suggestedLiteratureHtml(annotation.suggestedLiterature) + '</ul>'
    // PVSCL:ENDCOND
    // On before open
    let onBeforeOpen
    // PVSCL:IFCOND(Autofill or SuggestedLiterature or PreviousAssignments,LINE)
    onBeforeOpen = () => {
      // PVSCL:IFCOND(PreviousAssignments,LINE)
      let previousAssignmentAppendElements = document.querySelectorAll('.previousAssignmentAppendButton')
      previousAssignmentAppendElements.forEach((previousAssignmentAppendElement) => {
        previousAssignmentAppendElement.addEventListener('click', () => {
          // Append url to comment
          let commentTextarea = document.querySelector('#comment')
          commentTextarea.value = commentTextarea.value + previousAssignmentAppendElement.dataset.studentUrl
        })
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(Autofill,LINE)
      // Load datalist with previously used texts
      this.retrievePreviouslyUsedComments(themeOrCode).then((previousComments) => {
        let awesomeplete = new Awesomplete(document.querySelector('#comment'), {
          list: previousComments,
          minChars: 0
        })
        // On double click on comment, open the awesomeplete
        document.querySelector('#comment').addEventListener('dblclick', () => {
          awesomeplete.evaluate()
          awesomeplete.open()
        })
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(SuggestedLiterature,LINE)
      // Add the option to delete a suggestedLiterature from the comment
      $('.removeReference').on('click', function () {
        $(this).closest('li').remove()
      })
      // Autocomplete the suggestedLiteratures
      $('#swal-input1').autocomplete({
        source: function (request, response) {
          $.ajax({
            url: 'http://dblp.org/search/publ/api',
            data: {
              q: request.term,
              format: 'json',
              h: 5
            },
            success: function (data) {
              response(data.result.hits.hit.map((e) => { return {label: e.info.title + ' (' + e.info.year + ')', value: e.info.title + ' (' + e.info.year + ')', info: e.info} }))
            }
          })
        },
        minLength: 3,
        delay: 500,
        select: function (event, ui) {
          let content = ''
          if (ui.item.info.authors !== null && Array.isArray(ui.item.info.authors.author)) {
            content += ui.item.info.authors.author.join(', ') + ': '
          } else if (ui.item.info.authors !== null) {
            content += ui.item.info.authors.author + ': '
          }
          if (ui.item.info.title !== null) {
            content += ui.item.info.title
          }
          if (ui.item.info.year !== null) {
            content += ' (' + ui.item.info.year + ')'
          }
          let a = document.createElement('a')
          a.className = 'removeReference'
          a.addEventListener('click', function (e) {
            $(e.target).closest('li').remove()
          })
          let li = document.createElement('li')
          $(li).append(a, '<span title="' + content + '">' + content + '</span>')
          $('#literatureList').append(li)
          setTimeout(function () {
            $('#swal-input1').val('')
          }, 10)
        },
        appendTo: '.swal2-container',
        create: function () {
          $('.ui-autocomplete').css('max-width', $('.swal2-textarea').width())
        }
      })
      // PVSCL:ENDCOND
    }
    // PVSCL:ELSECOND
    onBeforeOpen = () => {}
    // PVSCL:ENDCOND
    // Preconfirm
    let preConfirmData = {}
    let preConfirm = () => {
      preConfirmData.comment = document.querySelector('#comment').value
      // PVSCL:IFCOND(SuggestedLiterature,LINE)
      preConfirmData.literature = Array.from($('#literatureList li span')).map((e) => { return $(e).attr('title') })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(SentimentAnalysis,LINE)
      if (preConfirmData.comment !== null && preConfirmData.comment !== '') {
        let settings = {
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          url: 'http://text-processing.com/api/sentiment/',
          data: qs.stringify({text: preConfirmData.comment})
        }
        axios(settings).then((response) => {
          if (response.data && response.data.label === 'neg' && response.data.probability.neg > 0.55) {
            // The comment is negative or offensive
            Alerts.confirmAlert({
              text: 'The message may be ofensive. Please modify it.',
              showCancelButton: true,
              cancelButtonText: 'Modify comment',
              confirmButtonText: 'Save as it is',
              reverseButtons: true,
              callback: () => {
                callback()
              },
              cancelCallback: () => {
                showForm(preConfirmData)
              }
            })
          } else {
            callback()
          }
        })
      } else {
        // Update annotation
        callback()
      }
      // PVSCL:ENDCOND
    }
    // Callback
    let callback = (err, result) => {
      if (!_.isUndefined(preConfirmData.comment)) { // It was pressed OK button instead of cancel, so update the annotation
        if (err) {
          window.alert('Unable to load alert. Is this an annotable document?')
        } else {
          // Update annotation
          annotation.text = preConfirmData.comment || ''
          // PVSCL:IFCOND(SuggestedLiterature,LINE)
          annotation.suggestedLiterature = preConfirmData.literature || []
          // PVSCL:ENDCOND
          window.abwa.annotationServerManager.client.updateAnnotation(
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
                if (sidebarOpen) {
                  this.openSidebar()
                }
              }
            })
        }
      }
    }
    return {html: html, onBeforeOpen: onBeforeOpen, preConfirm: preConfirm, callback: callback}
  }

  commentAnnotationHandler (annotation) {
    // Close sidebar if opened
    let sidebarOpen = window.abwa.sidebar.isOpened()
    this.closeSidebar()
    // PVSCL:IFCOND(PreviousAssignments,LINE)
    let previousAssignments = this.retrievePreviousAssignments()
    let previousAssignmentsUI = this.createPreviousAssignmentsUI(previousAssignments)
    // PVSCL:ENDCOND
    let themeOrCode = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(annotation.tagId)
    let title = ''
    // PVSCL:IFCOND(MoodleProvider,LINE)
    if (themeOrCode && LanguageUtils.isInstanceOf(themeOrCode, Theme)) {
      title = themeOrCode.name
    } else {
      title = themeOrCode.description
    }
    // PVSCL:ELSECOND
    if (themeOrCode) {
      title = themeOrCode.name
    }
    // PVSCL:ENDCOND
    let showForm = (preConfirmData) => {
      // Get last call to this form annotation text, not the init one
      if (_.isObject(preConfirmData) && preConfirmData.comment) {
        annotation.text = preConfirmData.comment
      }
      // Create form
      let generateFormObjects = {annotation, showForm, sidebarOpen}
      // PVSCL:IFCOND(Autofill,LINE)
      generateFormObjects['themeOrCode'] = themeOrCode
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(PreviousAssignments,LINE)
      generateFormObjects['previousAssignmentsUI'] = previousAssignmentsUI
      // PVSCL:ENDCOND
      let form = this.generateCommentForm(generateFormObjects)
      Alerts.multipleInputAlert({
        title: title,
        html: form.html,
        onBeforeOpen: form.onBeforeOpen,
        // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
        preConfirm: form.preConfirm,
        callback: () => {
          form.callback()
        }
      })
    }
    showForm()
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(PreviousAssignments,LINE)

  retrievePreviousAssignments () {
    return window.abwa.previousAssignments.previousAssignments
  }

  createPreviousAssignmentsUI (previousAssignments) {
    let previousAssignmentsContainer = document.createElement('div')
    previousAssignmentsContainer.className = 'previousAssignmentsContainer'
    for (let i = 0; i < previousAssignments.length; i++) {
      let previousAssignment = previousAssignments[i]
      // Create previous assignment element container
      let previousAssignmentElement = document.createElement('span')
      previousAssignmentElement.className = 'previousAssignmentContainer'
      // Create previous assignment link
      let previousAssignmentLinkElement = document.createElement('a')
      previousAssignmentLinkElement.href = previousAssignment.teacherUrl
      previousAssignmentLinkElement.target = '_blank'
      previousAssignmentLinkElement.innerText = previousAssignment.name
      previousAssignmentLinkElement.className = 'previousAssignmentLink'
      previousAssignmentElement.appendChild(previousAssignmentLinkElement)
      // Create previous assignment append img
      let previousAssignmentAppendElement = document.createElement('img')
      previousAssignmentAppendElement.src = chrome.extension.getURL('images/append.png')
      previousAssignmentAppendElement.title = 'Append the assignment URL'
      previousAssignmentAppendElement.className = 'previousAssignmentAppendButton'
      previousAssignmentAppendElement.dataset.studentUrl = previousAssignment.studentUrl
      previousAssignmentElement.appendChild(previousAssignmentAppendElement)
      previousAssignmentsContainer.appendChild(previousAssignmentElement)
    }
    return previousAssignmentsContainer
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Autofill,LINE)

  retrievePreviouslyUsedComments (themeOrCode) {
    let tag = ''
    if (LanguageUtils.isInstanceOf(themeOrCode, Theme)) {
      tag = Config.namespace + ':' + Config.tags.grouped.group + ':' + themeOrCode.name
    } else {
      tag = Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + themeOrCode.name
    }
    return new Promise((resolve, reject) => {
      window.abwa.annotationServerManager.client.searchAnnotations({
        tag: tag
      }, (err, annotations) => {
        if (err) {
          reject(err)
        } else {
          // TODO filter by motivation
          annotations = _.filter(annotations, (annotation) => {
            return annotation.motivation === Config.namespace + ':classifying'
          })
          // Get texts from annotations and send them in callback
          resolve(_.uniq(_.reject(_.map(annotations, (annotation) => {
            // Remove other students moodle urls
            let text = annotation.text
            console.debug(text)
            // TODO With feature AddReference
            // let regex = /\b(?:https?:\/\/)?[^/:]+\/.*?mod\/assign\/view.php\?id=[0-9]+/g
            // return text.replace(regex, '')
            if (text.replace(/ /g, '') !== '') {
              return text
            }
          }), _.isEmpty)))
        }
      })
      return true
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
    let annotation
    let annotationsToSearchIn
    // PVSCL:IFCOND(UserFilter, LINE)
    annotationsToSearchIn = this.currentAnnotations
    // PVSCL:ELSECOND
    annotationsToSearchIn = this.allAnnotations
    // PVSCL:ENDCOND
    annotation = _.find(annotationsToSearchIn, (annotation) => {
      return annotation.tags.includes(tag)
    })
    if (annotation) {
      this.goToAnnotation(annotation)
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
          }
        }
        window.PDFViewerApplication.findController.executeCommand('find', {query: queryTextSelector.exact, phraseSearch: true})
        // Timeout to remove highlight used by PDF.js
        setTimeout(() => {
          let pdfjsHighlights = document.querySelectorAll('.highlight')
          for (let i = 0; i < pdfjsHighlights.length; i++) {
            pdfjsHighlights[i].classList.remove('highlight')
          }
        }, 1000)
        // PVSCL:IFCOND(UserFilter, LINE)
        // Redraw annotations
        this.redrawAnnotations()
        // PVSCL:ENDCOND
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
      // Check if annotation exists
      if (_.find(this.allAnnotations, (annotation) => { return annotation.id === initAnnotation.id })) {
        // If document is pdf, the DOM is dynamic, we must scroll to annotation using PDF.js FindController
        if (window.abwa.targetManager.documentFormat === PDF) {
          this.goToAnnotation(initAnnotation)
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
        window.abwa.annotationServerManager.client.updateAnnotation(oldTagAnnotation.id, oldTagAnnotation, (err, annotation) => {
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
  // PVSCL:IFCOND(DeleteGroup, LINE)

  deleteAllAnnotations () {
    // Retrieve all the annotations
    let allAnnotations = this.allAnnotations
    window.abwa.annotationServerManager.client.deleteAnnotations(allAnnotations, (err) => {
      if (err) {
        Alerts.errorAlert({text: 'Unable to delete all the annotations in the document. Please try it again.'})
        this.updateAllAnnotations()
      } else {
        let deletedAnnotations = this.allAnnotations
        // Update annotation variables
        this.allAnnotations = []
        // PVSCL:IFCOND(UserFilter, LINE)
        this.currentAnnotations = []
        // PVSCL:ENDCOND
        // Dispatch event and redraw annotations
        LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, {annotations: this.allAnnotations})
        LanguageUtils.dispatchCustomEvent(Events.deletedAllAnnotations, {annotations: deletedAnnotations})
        this.redrawAnnotations()
      }
    })
  }
  // PVSCL:ENDCOND
}

module.exports = TextAnnotator
