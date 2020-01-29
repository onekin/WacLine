const Events = require('../../../Events')
const ImportCodebookJSON = require('./ImportCodebookJSON')

class ImportCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for export codebook event
    this.initImportCodebookEventHandler()
  }

  // EVENTS
  initImportCodebookEventHandler () {
    this.events.importCodebookEvent = {element: document, event: Events.importCodebook, handler: this.importCodebookEventHandler()}
    this.events.importCodebookEvent.element.addEventListener(this.events.importCodebookEvent.event, this.events.importCodebookEvent.handler, false)
  }

  importCodebookEventHandler () {
    return (event) => {
      switch (event.detail.importTo) {
        case 'JSON':
          ImportCodebookJSON.import()
          break
        default :
          ImportCodebookJSON.import()
      }
    }
  }
}

module.exports = ImportCodebook
