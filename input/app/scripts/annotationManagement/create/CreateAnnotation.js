import Events from '../../Events'
import _ from 'lodash'
import LanguageUtils from '../../utils/LanguageUtils'
import Alerts from '../../utils/Alerts'
import Annotation from '../Annotation'
import DOMTextUtils from '../../utils/DOMTextUtils'
import PDFTextUtils from '../../utils/PDFTextUtils'
import PDF from '../../target/formats/PDF'
import $ from 'jquery'
// PVSCL:IFCOND(Classifying, LINE)
import Classifying from '../purposes/Classifying'
import RolesManager from '../../contentScript/RolesManager'
// PVSCL:ENDCOND

class CreateAnnotation {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for createAnnotation event
    this.initCreateAnnotationEvent()
    this.initCreateKeywordAnnotationsEvent()
  }

  initCreateAnnotationEvent (callback) {
    this.events.createAnnotationEvent = { element: document, event: Events.createAnnotation, handler: this.createAnnotationEventHandler() }
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
        // PVSCL:IFCOND(MoodleResource, LINE)
        if (window.abwa.rolesManager.role === RolesManager.roles.consumer) {
          return
        }
        // PVSCL:ENDCOND
        let target
        // If selection is child of sidebar, return null
        if ($(document.getSelection().anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0) {
          Alerts.infoAlert({ text: chrome.i18n.getMessage('CurrentSelectionNotAnnotable') })
          return
        }
        // Create target
        target = this.obtainTargetToCreateAnnotation(event.detail)
        // Create body
        const body = this.obtainBodyToCreateAnnotation(event.detail)
        // Create tags
        const tags = this.obtainTagsToCreateAnnotation(event.detail)
        // Construct the annotation to send to hypothesis
        annotationToCreate = new Annotation({
          target: target,
          tags: tags,
          body: body
        })
      }
      if (annotationToCreate) {
        window.abwa.annotationServerManager.client.createNewAnnotation(annotationToCreate.serialize(), (err, annotation) => {
          if (err) {
            Alerts.errorAlert({ text: 'Unexpected error, unable to create annotation' })
          } else {
            window.getSelection().removeAllRanges()
            // Deserialize retrieved annotation from the server
            const deserializedAnnotation = Annotation.deserialize(annotation)
            // Dispatch annotation created event
            LanguageUtils.dispatchCustomEvent(Events.annotationCreated, { annotation: deserializedAnnotation })
          }
        })
      } else {
        // Show error
        Alerts.errorAlert({ text: 'Unexpected error creating annotation.' + chrome.i18n.getMessage('ErrorContactDeveloper', ['createAnnotation', encodeURIComponent(new Error().stack)]) })
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
      const codeOrTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(codeId)
      tags = tags.concat(codeOrTheme.getTags())
    }
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Assessing, LINE)

    // PVSCL:ENDCOND
    return tags
  }

  obtainBodyToCreateAnnotation ({
    /* PVSCL:IFCOND(Classifying) */codeId /* PVSCL:ENDCOND */
  }) {
    // Get bodies and tags for the annotation to be created
    const body = []
    // PVSCL:IFCOND(Classifying, LINE)
    // Get body for classifying
    if (codeId) {
      const codeOrTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(codeId)
      const classifyingBody = new Classifying({ code: codeOrTheme })
      body.push(classifyingBody.serialize())
    }
    // PVSCL:ENDCOND
    return body
  }

  // Add parameter annotation (pvscl)
  obtainTargetToCreateAnnotation ({ repliedAnnotation }) {
    if (repliedAnnotation) {
      // Get replying annotation source and create a target
      return [{ source: repliedAnnotation.target[0].source }]
    } else {
      const target = [{}]
      const source = window.abwa.targetManager.getDocumentURIs()
      // Get document title
      source.title = window.abwa.targetManager.documentTitle || ''
      // Get UUID for current target
      source.id = window.abwa.targetManager.getDocumentId()
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
    const range = document.getSelection().getRangeAt(0)
    const selectors = []
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
      const rangeSelector = DOMTextUtils.getRangeSelector(range)
      if (rangeSelector) {
        selectors.push(rangeSelector)
      }
    }
    // Create TextPositionSelector
    if (_.findIndex(window.abwa.targetManager.documentFormat.selectors, (elem) => { return elem === 'TextPositionSelector' }) !== -1) {
      const rootElement = window.abwa.targetManager.getDocumentRootElement()
      const textPositionSelector = DOMTextUtils.getTextPositionSelector(range, rootElement)
      if (textPositionSelector) {
        selectors.push(textPositionSelector)
      }
    }
    // Create TextQuoteSelector
    if (_.findIndex(window.abwa.targetManager.documentFormat.selectors, (elem) => { return elem === 'TextQuoteSelector' }) !== -1) {
      const textQuoteSelector = DOMTextUtils.getTextQuoteSelector(range)
      if (textQuoteSelector) {
        selectors.push(textQuoteSelector)
      }
    }
    return selectors
  }

  initCreateKeywordAnnotationsEvent (callback) {
    this.events.createKeywordAnnotationsEvent = { element: document, event: Events.createKeywordAnnotations, handler: this.createKeywordAnnotationsEventHandler() }
    this.events.createKeywordAnnotationsEvent.element.addEventListener(this.events.createKeywordAnnotationsEvent.event, this.events.createKeywordAnnotationsEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createKeywordAnnotationsEventHandler () {
    return (event) => {
      let newAnnotations = []
      let annotationToCreate
      // Create body
      const body = this.obtainBodyToCreateAnnotation(event.detail)
      // Create tags
      const tags = this.obtainTagsToCreateAnnotation(event.detail)

      const source = window.abwa.targetManager.getDocumentURIs()
      // Get document title
      source.title = window.abwa.targetManager.documentTitle || ''
      // Get UUID for current target
      source.id = window.abwa.targetManager.getDocumentId()

      event.detail.foundSelectors.forEach((newSelectors) => {
        let target = [{}]
        target[0].source = source // Add source to the target
        target[0].selector = newSelectors
        annotationToCreate = new Annotation({
          target: target,
          tags: tags,
          body: body
        })
        window.abwa.annotationServerManager.client.createNewAnnotation(annotationToCreate.serialize(), (err, annotation) => {
          if (err) {
            Alerts.errorAlert({ text: 'Unexpected error, unable to create annotation' })
          } else {
            // Deserialize retrieved annotation from the server
            const deserializedAnnotation = Annotation.deserialize(annotation)
            newAnnotations.push(deserializedAnnotation)
          }
        })
      })
      // Call to event annotations created
      LanguageUtils.dispatchCustomEvent(Events.keywordAnnotationsCreated, { annotations: newAnnotations })
    }
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }
}

export default CreateAnnotation
