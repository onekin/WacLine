import Events from '../../Events'
import jsYaml from 'js-yaml'
import GoogleSheetClient from '../../googleSheets/GoogleSheetClient'
import _ from 'lodash'
import Classifying from '../purposes/Classifying'
import Commenting from '../purposes/Commenting'
import RandomUtils from '../../utils/RandomUtils'
import Assessing from '../purposes/Assessing'

class GoogleSheetAuditLogging {
  init (callback) {
    // Init database

    // Listeners initialization
    this.listenersInit()
  }

  destroy () {
    // Destroy event listeners
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  sendCallToBackground (cmd, data, callback) {
    chrome.runtime.sendMessage({
      scope: 'googleSheets',
      cmd: cmd,
      data: data
    }, (result) => {
      if (_.has(result, 'err')) {
        callback(result.err)
      } else {
        callback(null, result)
      }
    })
  }

  listenersInit () {
    this.events = {}
    // Events for classification spreadsheet
    // annotationCreated event
    this.events.annotationCreatedEvent = { element: document, event: Events.annotationCreated, handler: this.createdAnnotationHandler() }
    this.events.annotationCreatedEvent.element.addEventListener(this.events.annotationCreatedEvent.event, this.events.annotationCreatedEvent.handler, false)
    // annotationUpdated event
    this.events.annotationUpdatedEvent = { element: document, event: Events.annotationUpdated, handler: this.updatedAnnotationHandler() }
    this.events.annotationUpdatedEvent.element.addEventListener(this.events.annotationUpdatedEvent.event, this.events.annotationUpdatedEvent.handler, false)
    // annotationDeleted event
    this.events.annotationDeletedEvent = { element: document, event: Events.annotationDeleted, handler: this.deletedAnnotationHandler() }
    this.events.annotationDeletedEvent.element.addEventListener(this.events.annotationDeletedEvent.event, this.events.annotationDeletedEvent.handler, false)
    // TODO Events for codebook development and linking spreadsheets
    // themeCreated event
    this.events.themeCreatedEvent = { element: document, event: Events.themeCreated, handler: this.createdThemeHandler() }
    this.events.themeCreatedEvent.element.addEventListener(this.events.themeCreatedEvent.event, this.events.themeCreatedEvent.handler, false)
    // themeUpdated event
    this.events.themeUpdatedEvent = { element: document, event: Events.themeUpdated, handler: this.updatedThemeHandler() }
    this.events.themeUpdatedEvent.element.addEventListener(this.events.themeUpdatedEvent.event, this.events.themeUpdatedEvent.handler, false)
    // themeRemoved event
    this.events.themeDeletedEvent = { element: document, event: Events.themeRemoved, handler: this.deletedThemeHandler() }
    this.events.themeDeletedEvent.element.addEventListener(this.events.themeDeletedEvent.event, this.events.themeDeletedEvent.handler, false)
    // codeCreated event
    this.events.codeCreatedEvent = { element: document, event: Events.codeCreated, handler: this.createdCodeHandler() }
    this.events.codeCreatedEvent.element.addEventListener(this.events.codeCreatedEvent.event, this.events.codeCreatedEvent.handler, false)
    // codeUpdated event
    this.events.codeUpdatedEvent = { element: document, event: Events.codeUpdated, handler: this.updatedCodeHandler() }
    this.events.codeUpdatedEvent.element.addEventListener(this.events.codeUpdatedEvent.event, this.events.codeUpdatedEvent.handler, false)
    // codeRemoved event
    this.events.codeDeletedEvent = { element: document, event: Events.codeRemoved, handler: this.deletedCodeHandler() }
    this.events.codeDeletedEvent.element.addEventListener(this.events.codeDeletedEvent.event, this.events.codeDeletedEvent.handler, false)
    // TODO Events for assessing spreadsheet
  }

  createdThemeHandler () {
    return (event) => {
      // Everytime a theme is created
      let annotation = event.detail.themeAnnotation
      let row = this.codebooking2Row(annotation, 'schema:CreateAction')
      this.sendCallToBackground('appendRowSpreadSheet', {
        spreadsheetId: annotation.group,
        range: 'LOG-codebookDevelopment',
        data: { values: [row] }
      })
    }
  }

  updatedThemeHandler () {
    return (event) => {
      // Everytime a theme is updated
      let annotations = event.detail.themeAnnotations
      if (_.isArray(annotations)) {
        let annotation = annotations.find(annotation => annotation.tags.find(tag => tag.includes('oa:theme:'))) // Get only the annotation for the theme
        let row = this.codebooking2Row(annotation, 'schema:ReplaceAction')
        this.sendCallToBackground('appendRowSpreadSheet', {
          spreadsheetId: annotation.group,
          range: 'LOG-codebookDevelopment',
          data: { values: [row] }
        })
      }
    }
  }

  deletedThemeHandler () {
    return (event) => {
      // Everytime a theme is deleted
      let annotation = event.detail.themeAnnotation
      let row = this.codebooking2Row(annotation, 'schema:DeleteAction')
      this.sendCallToBackground('appendRowSpreadSheet', {
        spreadsheetId: annotation.group,
        range: 'LOG-codebookDevelopment',
        data: { values: [row] }
      })
      // TODO Comment with @ikerazpeitia: should we add to the linking log that themes and it's codes where unlinked ¿?
    }
  }

  createdCodeHandler () {
    return (event) => {
      // Everytime a code is created
      let annotation = event.detail.codeAnnotation
      let codebookRow = this.codebooking2Row(annotation, 'schema:CreateAction')
      this.sendCallToBackground('appendRowSpreadSheet', {
        spreadsheetId: annotation.group,
        range: 'LOG-codebookDevelopment',
        data: { values: [codebookRow] }
      })
      // Add to linking spreadsheet
      let linkingRow = this.linking2Row(annotation, 'schema:CreateAction')
      this.sendCallToBackground('appendRowSpreadSheet', {
        spreadsheetId: annotation.group,
        range: 'LOG-linking',
        data: { values: [linkingRow] }
      })
    }
  }

  updatedCodeHandler () {
    return (event) => {
      // Everytime a code is updated
      let annotation = event.detail.codeAnnotation
      let row = this.codebooking2Row(annotation, 'schema:ReplaceAction')
      this.sendCallToBackground('appendRowSpreadSheet', {
        spreadsheetId: annotation.group,
        range: 'LOG-codebookDevelopment',
        data: { values: [row] }
      })
    }
  }

  deletedCodeHandler () {
    return (event) => {
      // Everytime a code is deleted
      let annotation = event.detail.codeAnnotation
      let row = this.codebooking2Row(annotation, 'schema:DeleteAction')
      this.sendCallToBackground('appendRowSpreadSheet', {
        spreadsheetId: annotation.group,
        range: 'LOG-codebookDevelopment',
        data: { values: [row] }
      })
      // Add to linking spreadsheet
      let linkingRow = this.linking2Row(annotation, 'schema:DeleteAction')
      this.sendCallToBackground('appendRowSpreadSheet', {
        spreadsheetId: annotation.group,
        range: 'LOG-linking',
        data: { values: [linkingRow] }
      })
    }
  }

  createdAnnotationHandler () {
    return (event) => {
      // Everytime an annotation is created
      let annotation = event.detail.annotation
      let row, range
      // Check if annotation is for classification or works as a reply
      if (annotation.references.length > 0) {
        row = this.assessing2Row(annotation, 'schema:CreateAction')
        range = 'LOG-assessing'
      } else {
        row = this.classifying2Row(annotation, 'schema:CreateAction')
        range = 'LOG-classifying'
      }
      this.sendCallToBackground('appendRowSpreadSheet', {
        spreadsheetId: annotation.group,
        range: range,
        data: { values: [row] }
      }, (err, result) => {
        if (err) {
          console.error(err)
        } else {
          console.log(result)
        }
      })
    }
  }

  updatedAnnotationHandler () {
    return (event) => {
      // Everytime an annotation is updated
      let annotation = event.detail.annotation
      let row, range
      // Check if annotation is for classification or works as a reply
      if (annotation.references.length > 0) {
        row = this.assessing2Row(annotation, 'schema:CreateAction')
        range = 'LOG-assessing'
      } else {
        row = this.classifying2Row(annotation, 'schema:CreateAction')
        range = 'LOG-classifying'
      }
      this.sendCallToBackground('appendRowSpreadSheet', {
        spreadsheetId: annotation.group,
        range: range,
        data: { values: [row] }
      }, (err, result) => {
        if (err) {
          console.error(err)
        } else {
          console.log(result)
        }
      })
    }
  }

  deletedAnnotationHandler () {
    return (event) => {
      // Everytime an annotation is deleted
      let annotation = event.detail.annotation
      let row = this.classifying2Row(annotation, 'schema:DeleteAction')
      // TODO Currently it is not possible to delete a reply (should be implemented in wacline) When that occurs, this should handle also annotation deletions for replies in the same way as createdAnnotationHandler and updatedAnnotationHandler
      this.sendCallToBackground('appendRowSpreadSheet', {
        spreadsheetId: annotation.group,
        range: 'LOG-classifying',
        data: { values: [row] }
      }, (err, result) => {
        if (err) {
          console.error(err)
        } else {
          console.log(result)
        }
      })
    }
  }

  linking2Row (data, action) { // IKER: verificar y completar este
    try {
      let id = 0
      let created = 1
      let creator = 2
      let hasbody = 3
      let hastarget = 4
      let motivatedby = 5
      let potentialaction = 6
      let row = []
      row[id] = RandomUtils.randomString(22)
      row[created] = data.created
      row[creator] = data.user // TODO Should we change to data.creator?
      let themeBody = data.body.find(elem => elem.type === 'Theme')
      if (themeBody) {
        row[hasbody] = themeBody.id
      }
      row[hastarget] = data.id
      row[motivatedby] = 'oa:linking' // TODO Comment with @ikerazpeitia that OA has linking
      row[potentialaction] = action
      return row
    } catch (err) {
      return err
    }
  }

  assessing2Row (data, action) { // IKER: verificar y completar este
    try {
      let id = 0
      let created = 1
      let creator = 2
      let hastarget = 3
      let comment = 4
      let purpose = 5
      let motivatedby = 6
      let potentialaction = 7
      let row = []
      row[id] = data.id
      row[created] = data.created
      row[creator] = data.creator.replace(window.abwa.annotationServerManager.annotationServerMetadata.userUrl, '')
      row[hastarget] = data.references[0] // Check if references array should be inserted as part of target
      let commentingBody = data.body.find(elem => elem instanceof Commenting)
      if (commentingBody) {
        row[comment] = commentingBody.value || ''
      }
      let assessingBody = data.body.find(body => body instanceof Assessing)
      if (assessingBody) {
        if (assessingBody.value === 'up') {
          row[purpose] = 'slr:agreeing'
        } else if (assessingBody.value === 'down') {
          row[purpose] = 'slr:disagreeing'
        } else {
          throw new Error('No assessment')
        }
      }
      row[motivatedby] = 'oa:assessing'
      row[potentialaction] = action
      return row
    } catch (err) {
      return err
    }
  }

  codebooking2Row (data, action) {
    try {
      let id = 0
      let created = 1
      let creator = 2
      let hasbody = 3
      let hassource = 4
      let exact = 5
      let prefix = 6
      let suffix = 7
      let start = 8
      let end = 9
      let comment = 10
      let motivatedby = 11
      let potentialaction = 12
      let encoding = 13
      let multivalued = 14
      let row = []
      row[id] = data.id
      row[created] = data.created
      row[creator] = data.user // TODO Should we change to data.creator?
      row[hasbody] = data.tags[0].replace('oa:theme:', '').replace('oa:code:', '') // For the case of themes and codes
      // Find the target that talks about where was created (must include source.id, textquoteselector and textpositionselector
      let evidenceTarget = data.target.find(target => { return _.has(target, 'source.id') && _.has(target, 'selector') && target.selector.find(selector => selector.type === 'TextPositionSelector') && target.selector.find(selector => selector.type === 'TextQuoteSelector') })
      if (!_.isEmpty(evidenceTarget)) {
        row[hassource] = evidenceTarget.source.id
        let quote = this.searchInArray(evidenceTarget.selector, 'type', 'TextQuoteSelector')
        row[exact] = quote.exact
        row[prefix] = quote.prefix
        row[suffix] = quote.suffix
        let position = this.searchInArray(evidenceTarget.selector, 'type', 'TextPositionSelector')
        row[start] = position.start
        row[end] = position.end
      }
      try {
        let config = jsYaml.load(data.text)
        let description = config.description
        row[comment] = description
      } catch (e) {
        // Ignore error
      }
      row[motivatedby] = 'slr:codebookDevelopment'
      row[potentialaction] = action
      return row
    } catch (err) {
      return err
    }
  }

  classifying2Row (data, action = 'schema:CreateAction') {
    try {
      let id = 0
      let created = 1
      let creator = 2
      let hasbody = 3
      let hassource = 4
      let exact = 5
      let prefix = 6
      let suffix = 7
      let start = 8
      let end = 9
      let comment = 10
      let motivatedby = 11
      let potentialaction = 12
      let encoding = 13
      let row = []
      row[id] = data.id
      row[created] = data.created
      row[creator] = data.creator.replace(window.abwa.annotationServerManager.annotationServerMetadata.userUrl, '')
      let classifyingBody = data.body.find(elem => elem instanceof Classifying)
      if (classifyingBody) {
        row[hasbody] = classifyingBody.value.id
      } else {
        throw new Error('Annotation has not a valid code or theme')
      }
      row[hassource] = data.target[0].source.id
      let quote = this.searchInArray(data.target[0].selector, 'type', 'TextQuoteSelector')
      row[exact] = quote.exact
      row[prefix] = quote.prefix
      row[suffix] = quote.suffix
      let position = this.searchInArray(data.target[0].selector, 'type', 'TextPositionSelector')
      row[start] = position.start
      row[end] = position.end
      let commentingBody = data.body.find(elem => elem instanceof Commenting)
      if (commentingBody) {
        row[comment] = commentingBody.value || ''
      }
      row[motivatedby] = 'oa:classifying' // TODO Verify with Iker if this is correct or not
      row[potentialaction] = action
      return row
    } catch (err) {
      return err
    }
  }

  paper2Row (data) {
    try {
      let id = 0
      let title = 1
      let doi = 2
      let uri = 3
      let urn = 4
      let encoding = 5
      let rowPaper = []
      rowPaper[id] = data.id
      rowPaper[title] = data.title
      rowPaper[doi] = data.doi
      rowPaper[uri] = data.url
      rowPaper[urn] = data.urn
      rowPaper[encoding] = this.encodeHide(JSON.stringify(data))
      return rowPaper
    } catch (err) {
      return err
    }
  }

  searchInArray (data, field, value) {
    for (let j = 0; j < data.length; j++) {
      if (data[j][field] === value) return data[j]
    }
    return {}
  }

}

export default GoogleSheetAuditLogging
