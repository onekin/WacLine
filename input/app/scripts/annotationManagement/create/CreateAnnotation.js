const Events = require('../../Events')
const _ = require('lodash')
const LanguageUtils = require('../../utils/LanguageUtils')
const Alerts = require('../../utils/Alerts')
const Annotation = require('../Annotation')
const DOMTextUtils = require('../../utils/DOMTextUtils')
const PDFTextUtils = require('../../utils/PDFTextUtils')
const PDF = require('../../target/formats/PDF')
const $ = require('jquery')
// PVSCL:IFCOND(Classifying, LINE)
const Classifying = require('../purposes/Classifying')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Classifying, LINE)
const Linking = require('../purposes/Linking')
// PVSCL:ENDCOND

class CreateAnnotation {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for createAnnotation event
    this.initCreateAnnotationEvent()
  }

  initCreateAnnotationEvent (callback) {
    this.events.createAnnotationEvent = {element: document, event: Events.createAnnotation, handler: this.createAnnotationEventHandler()}
    this.events.createAnnotationEvent.element.addEventListener(this.events.createAnnotationEvent.event, this.events.createAnnotationEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createAnnotationEventHandler () {
    return (event) => {
      let annotationToCreate
      if (event.detail.purpose === 'replying') {
        // Annotation is already prepared to send to the server
        annotationToCreate = event.detail.replyingAnnotation
      } else if (event.detail.purpose === 'classifying') {
        let target
        // If selection is child of sidebar, return null
        if ($(document.getSelection().anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0) {
          Alerts.infoAlert({text: chrome.i18n.getMessage('CurrentSelectionNotAnnotable')})
          return
        }
        // Create target
        target = this.obtainTargetToCreateAnnotation(event.detail)
        // Create body
        let body = this.obtainBodyToCreateAnnotation(event.detail)
        // Create tags
        let tags = this.obtainTagsToCreateAnnotation(event.detail)
        // Construct the annotation to send to hypothesis
        annotationToCreate = new Annotation({
          target: target,
          tags: tags,
          body: body
        })
      } /* PVSCL:IFCOND(Linking) */ else if (event.detail.purpose === 'linking') {
        let target
        // If selection is child of sidebar, return null
        if ($(document.getSelection().anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0) {
          Alerts.infoAlert({text: chrome.i18n.getMessage('CurrentSelectionNotAnnotable')})
          return
        }
        // Create target
        target = this.obtainTargetToCreateAnnotation(event.detail)
        // Create body
        let body = this.obtainBodyToCreateAnnotation(event.detail)
        // Create tags
        let tags = this.obtainTagsToCreateAnnotation(event.detail)
        // Construct the annotation to send to hypothesis
        annotationToCreate = new Annotation({
          target: target,
          tags: tags,
          body: body
        })
      } /* PVSCL:ENDCOND */
      if (annotationToCreate) {
        window.abwa.annotationServerManager.client.createNewAnnotation(annotationToCreate.serialize(), (err, annotation) => {
          if (err) {
            Alerts.errorAlert({text: 'Unexpected error, unable to create annotation'})
          } else {
            window.getSelection().removeAllRanges()
            // Deserialize retrieved annotation from the server
            let deserializedAnnotation = Annotation.deserialize(annotation)
            // Dispatch annotation created event
            LanguageUtils.dispatchCustomEvent(Events.annotationCreated, {annotation: deserializedAnnotation})
          }
        })
      } else {
        // Show error
        Alerts.errorAlert({text: 'Unexpected error creating annotation.' + chrome.i18n.getMessage('ErrorContactDeveloper', ['createAnnotation', encodeURIComponent(new Error().stack)])})
      }
    }
  }

  obtainTagsToCreateAnnotation ({
    tags,
    /* PVSCL:IFCOND(Classifying) */ codeId /* PVSCL:ENDCOND */
  }) {
    if (tags) {
      tags = _.isArray(tags) ? tags : [tags]
    } else {
      tags = []
    }
    // PVSCL:IFCOND(Classifying, LINE)
    if (codeId) {
      let codeOrTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(codeId)
      tags = tags.concat(codeOrTheme.getTags())
    }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Assessing, LINE)

    // PVSCL:ENDCOND
    return tags
  }

  obtainBodyToCreateAnnotation (detail) {
    // Get bodies and tags for the annotation to be created
    let body = []
    // PVSCL:IFCOND(Classifying, LINE)
    // Get body for classifying
    if (detail.purpose === 'classifying') {
      if (detail.codeId) {
        let codeOrTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(detail.codeId)
        let classifyingBody = new Classifying({code: codeOrTheme})
        body.push(classifyingBody.serialize())
      }
    }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Linking, LINE)
    // Get body for classifying
    if (detail.purpose === 'linking') {
      if (detail.from && detail.to && detail.linkingWord) {
        let value = {}
        value.from = detail.from
        value.to = detail.to
        value.linkingWord = detail.linkingWord
        let classifyingBody = new Linking({value})
        body.push(classifyingBody.serialize())
      }
    }
    // PVSCL:ENDCOND
    return body
  }

  obtainTargetToCreateAnnotation ({repliedAnnotation}) {
    if (repliedAnnotation) {
      // Get replying annotation source and create a target
      return [{source: repliedAnnotation.target[0].source}]
    } else {
      let target = [{}]
      let source = window.abwa.targetManager.getDocumentURIs()
      // Get document title
      source['title'] = window.abwa.targetManager.documentTitle || ''
      // Get UUID for current target
      source['id'] = window.abwa.targetManager.getDocumentId()
      target[0].source = source // Add source to the target
      // PVSCL:IFCOND(Selector, LINE)
      if (document.getSelection().toString().length > 0) {
        target[0].selector = CreateAnnotation.getSelectorsOfSelectedTextContent()
      }
      // PVSCL:ENDCOND
      return target
    }
  }

  static getSelectorsOfSelectedTextContent () {
    let range = document.getSelection().getRangeAt(0)
    let selectors = []
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
    return selectors
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }
}

module.exports = CreateAnnotation
