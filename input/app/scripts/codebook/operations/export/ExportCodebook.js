const Events = require('../../../Events')
const _ = require('lodash')
const ExportCodebookJSON = require('./export/ExportCodebookJSON')

class ExportCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for export codebook event
    this.initExportCodebookEventHandler()
  }

  // EVENTS
  initExportCodebookEventHandler () {
    this.events.exportCodebookEvent = {element: document, event: Events.exportCodebook, handler: this.exportCodebookEventHandler()}
    this.events.exportCodebookEvent.element.addEventListener(this.events.exportCodebookEvent.event, this.events.exportCodebookEvent.handler, false)
  }

  exportCodebookEventHandler () {
    return (event) => {
      switch (event.detail.exportTo) {
        case 'JSON':
          ExportCodebookJSON.exportConfigurationSchemaToJSONFile(event.details.codebookAnnotations, event.details.codebook)
          break;
        default:
          ExportCodebookJSON.exportConfigurationSchemaToJSONFile(event.details.codebookAnnotations, event.details.codebook)
      }
    }
  }
}

module.exports = ExportCodebook
