import Events from '../../../Events'
import _ from 'lodash'
import ExportCodebookJSON from './ExportCodebookJSON'

class ExportCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for export codebook event
    this.initExportCodebookEventHandler()
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  // EVENTS
  initExportCodebookEventHandler () {
    this.events.exportCodebookEvent = { element: document, event: Events.exportCodebook, handler: this.exportCodebookEventHandler() }
    this.events.exportCodebookEvent.element.addEventListener(this.events.exportCodebookEvent.event, this.events.exportCodebookEvent.handler, false)
  }

  exportCodebookEventHandler () {
    return (event) => {
      switch (event.detail.exportTo) {
        case 'JSON':
          ExportCodebookJSON.exportConfigurationSchemaToJSONFile(event.detail.codebookAnnotations, event.detail.codebook)
          break
        default :
          ExportCodebookJSON.exportConfigurationSchemaToJSONFile(event.detail.codebookAnnotations, event.detail.codebook)
      }
    }
  }
}

export default ExportCodebook
