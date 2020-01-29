const Events = require('../../../Events')
// PVSCL:IFCOND(BuiltIn, LINE)
const BuiltIn = require('./builtIn/BuiltIn')
const EmptyCodebook = require('./emptyCodebook/EmptyCodebook')
// PVSCL:ENDCOND
class CreateCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for createCodebook event
    this.initCreateCodebookEvent()
  }

  // EVENTS
  initCreateCodebookEvent () {
    this.events.createCodebook = {element: document, event: Events.createCodebook, handler: this.createCodebookEventHandler()}
    this.events.createCodebook.element.addEventListener(this.events.createCodebook.event, this.events.createCodebook.handler, false)
  }

  createCodebookEventHandler () {
    return (event) => {
      // PVSCL:IFCOND(BuiltIn, LINE)
      let howCreate = event.detail.howCreate
      if (howCreate === 'builtIn') {
        BuiltIn.createDefaultAnnotations()
      }
      if (howCreate === 'emptyCodebook') {
        EmptyCodebook.createDefaultAnnotations()
      }
      // PVSCL:ENDCOND
    }
  }
}

module.exports = CreateCodebook
