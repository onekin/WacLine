const Events = require('../../Events')

class CreateCoodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for createAnnotation event
    this.initCreateCoodebookEvent()
  }

  initCreateCoodebookEvent (callback) {
    this.events.createCoodebookEvent = {element: document, event: Events.createCodebook, handler: this.createCoodebookEventHandler()}
    this.events.createCoodebookEvent.element.addEventListener(this.events.createCoodebookEvent.event, this.events.createCoodebookEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createCoodebookEventHandler () {
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
    let codeOrTheme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(codeId)
    tags = tags.concat(codeOrTheme.getTags())
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Assessing, LINE)

    // PVSCL:ENDCOND
    return tags
  }

  obtainBodyToCreateAnnotation ({
                                  /* PVSCL:IFCOND(Classifying) */codeId /* PVSCL:ENDCOND */
                                }) {
    // Get bodies and tags for the annotation to be created
    let body = []
    // PVSCL:IFCOND(Classifying, LINE)
    // Get body and tags for classifying
    let codeOrTheme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(codeId)
    let classifyingBody = new Classifying({code: codeOrTheme})
    body.push(classifyingBody.serialize())
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Commenting, LINE)

    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Replying, LINE)

    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Assessing, LINE)

    // PVSCL:ENDCOND
    return body
  }

  obtainTargetToCreateAnnotation ({replyingAnnotation}) {
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

  static constructAnnotation ({target, body = [], tags = []}) {
    let data = {
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      group: window.abwa.groupSelector.currentGroup.id,
      creator: window.abwa.groupSelector.getCreatorData() || window.abwa.groupSelector.user.userid,
      document: {},
      body: body,
      permissions: {
        read: ['group:' + window.abwa.groupSelector.currentGroup.id]
      },
      references: [],
      // PVSCL:IFCOND(SuggestedLiterature,LINE)
      suggestedLiterature: [],
      // PVSCL:ENDCOND
      tags: tags,
      target: target,
      text: '',
      uri: window.abwa.targetManager.getDocumentURIToSaveInAnnotationServer()
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
    return data
  }
}

module.exports = CreateAnnotation
