import Events from '../../Events'
import GoogleSheetClient from '../../googleSheets/GoogleSheetClient'
import _ from 'lodash'
import Classifying from '../purposes/Classifying'

class GoogleSheetAuditLogging {
  init (callback) {
    // Init database

    // Listeners initialization
    this.listenersInit()
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
    this.events.annotationCreatedEvent = { element: document, event: Events.annotationCreated, handler: this.createdAnnotationHandler() }
    this.events.annotationCreatedEvent.element.addEventListener(this.events.annotationCreatedEvent.event, this.events.annotationCreatedEvent.handler, false)
  }

  createdAnnotationHandler () {
    return (event) => {
      // Everytime an annotation is created
      let annotation = event.detail.annotation
      let row = this.classifying2Row(annotation, 'schema:CreateAction')
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

  destroy () {
    // Destroy event listeners
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  createNewGSheetAnnotations (annotations = [], callback) {
    try {
      this.processGSheetAnnotations(annotations, callback, 'schema:CreateAction')
    } catch (err) {
      callback(err)
    }
  }

  processGSheetAnnotations (annotations = [], callback, action) {
    try {
      // this.LocalStorageManager.client.createNewAnnotations(annotations, callback)
      let spreadsheetId = window.abwa.groupSelector.currentGroup.id
      let classifyingRange = window.background.googleSheetAnnotationManager.classifyingRange
      let codebookDevelopmentRange = window.background.googleSheetAnnotationManager.codebookDevelopmentRange
      let paperRange = window.background.googleSheetAnnotationManager.paperRange
      let linkingRange = window.background.googleSheetAnnotationManager.linkingRange
      let assessingRange = window.background.googleSheetAnnotationManager.assessingRange
      let rows = this.annotations2Rows(annotations, action)
      if (rows.classifying.length > 0) {
        let data = { values: rows.classifying }
        this.client.appendRowSpreadSheet(spreadsheetId, classifyingRange, data, callback)
      }
      if (rows.codebookDevelopment.length > 0) {
        let data = { values: rows.codebookDevelopment }
        this.client.appendRowSpreadSheet(spreadsheetId, codebookDevelopmentRange, data, callback)
      }
      if (rows.paper.length > 0) {
        let doi = 2
        let uri = 3
        let urn = 4
        let newPapers = []
        let newPapersExist = false
        for (let rp in rows.paper) {
          let rowpaper = rows.paper[rp]
          let paperExists = false
          for (let p in this.papers) {
            let paper = this.papers[p]
            if ((paper[doi] === rowpaper[doi] && !_.isEmpty(paper[doi])) || (paper[uri] === rowpaper[uri] && !_.isEmpty(paper[uri])) || (paper[urn] === rowpaper[urn] && !_.isEmpty(paper[urn]))) {
              paperExists = true
            }
          }
          if (!paperExists) {
            newPapers.push(rowpaper)
            this.papers.push(rowpaper)
            newPapersExist = true
          }
        }
        if (newPapersExist) {
          let data = { values: newPapers }
          this.client.appendRowSpreadSheet(spreadsheetId, paperRange, data, callback)
        }
      }
      if (rows.linking.length > 0) {
        let data = { values: rows.linking }
        this.client.appendRowSpreadSheet(spreadsheetId, linkingRange, data, callback)
      }
      if (rows.assessing.length > 0) {
        let data = { values: rows.assessing }
        this.client.appendRowSpreadSheet(spreadsheetId, assessingRange, data, callback)
      }
    } catch (err) {
      callback(err)
    }
  }

  annotations2Rows (annotations = [], action) {
    let codebookDevelopment = []
    let linking = []
    let classifying = []
    let assessing = []
    let paper = []
    for (let ann in annotations) {
      let data = annotations[ann]
      switch (data.motivation) {
        case 'codebookDevelopment': {
          codebookDevelopment.push(this.codebooking2Row(data, action))
          paper.push(this.paper2Row(data.target[0].source))
          break }
        case 'linking': {
          linking.push(this.linking2Row(data, action))
          break }
        case 'classifying': {
          classifying.push(this.classifying2Row(data, action))
          paper.push(this.paper2Row(data.target[0].source))
          break }
        case 'assessing': {
          assessing.push(this.assessing2Row(data, action))
          break }
      }
    }
    let rows = { codebookDevelopment: codebookDevelopment, linking: linking, classifying: classifying, assessing: assessing, paper: paper }
    return rows
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
      let encoding = 7
      let row = []
      row[id] = data.id
      row[created] = data.created
      row[creator] = window.background.googleSheetAnnotationManager.annotationServerManager.userEmail // data.user
      row[hasbody] = data.body
      row[hastarget] = data.target[0].source.id
      row[motivatedby] = data.motivation // 'slr:linking'
      row[potentialaction] = action
      row[encoding] = this.encodeHide(JSON.stringify(data))
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
      let hasbody = 4
      let comment = 5
      let purpose = 6
      let motivatedby = 7
      let potentialaction = 8
      let encoding = 9
      let row = []
      row[id] = data.id
      row[created] = new Date().toISOString()
      row[creator] = window.background.googleSheetAnnotationManager.annotationServerManager.userEmail // data.user
      row[hastarget] = data['oa:target'] // data.target[0].selector
      row[hasbody] = null // COMO DETECTARLO??
      row[comment] = data.text
      let verdict = 'slr:agreeing'
      if (data.agreement === 'disagree') {
        verdict = 'slr:disagreeing'
      }
      row[purpose] = verdict
      row[motivatedby] = 'oa:' + data.motivation // 'oa:assessing'
      row[potentialaction] = action
      row[encoding] = this.encodeHide(JSON.stringify(data))
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
      row[creator] = window.background.googleSheetAnnotationManager.annotationServerManager.userEmail // data.user
      row[hasbody] = data.body.value
      row[hassource] = data.target[0].source.id
      let quote = this.searchInArray(data.target[0].selector, 'type', 'TextQuoteSelector')
      row[exact] = quote.exact
      row[prefix] = quote.prefix
      row[suffix] = quote.suffix
      let position = this.searchInArray(data.target[0].selector, 'type', 'TextPositionSelector')
      row[start] = position.start
      row[end] = position.end
      row[comment] = data.body.description // data.text
      row[motivatedby] = data.motivation // 'slr:codebookDevelopment'
      row[potentialaction] = action
      row[encoding] = this.encodeHide(JSON.stringify(data))
      row[multivalued] = data.body.multivalued
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
      row[comment] = data.text || ''
      row[motivatedby] = 'oa:classifying' // TODO Verify with Iker if this is correct or not
      row[potentialaction] = action
      // row[encoding] = this.encodeHide(JSON.stringify(data)) // TODO Verify with Iker if this is still necessary
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
