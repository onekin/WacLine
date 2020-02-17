const Events = require('../../../Events')
const ImportCodebookJSON = require('./ImportCodebookJSON')
const _ = require('lodash')

class ImportCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for export codebook event
    this.initImportCodebookEventHandler()
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
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
