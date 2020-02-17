const _ = require('lodash')
const Events = require('../../../Events')
const Alerts = require('../../../utils/Alerts')
const LanguageUtils = require('../../../utils/LanguageUtils')

class RenameCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for renameCodebook event
    this.initRenameCodebookEvent()
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  // EVENTS
  initRenameCodebookEvent () {
    this.events.renameCodebookEvent = {element: document, event: Events.renameCodebook, handler: this.renameCodebookEventHandler()}
    this.events.renameCodebookEvent.element.addEventListener(this.events.renameCodebookEvent.event, this.events.renameCodebookEvent.handler, false)
  }

  /**
   * Event handler for renameCodebook.
   */
  renameCodebookEventHandler () {
    return (event) => {
      let codebook = event.detail.codebook
      Alerts.inputTextAlert({
        title: 'Rename review model ' + codebook.name,
        inputPlaceholder: 'Type here the name of your new review model...',
        inputValue: codebook.name,
        preConfirm: (codebookName) => {
          if (_.isString(codebookName)) {
            if (codebookName.length <= 0) {
              const swal = require('sweetalert2')
              swal.showValidationMessage('Name cannot be empty.')
            } else if (codebookName.length > 25) {
              const swal = require('sweetalert2')
              swal.showValidationMessage('The review model name cannot be higher than 25 characters.')
            } else {
              return codebookName
            }
          }
        },
        callback: (err, codebookName) => {
          if (err) {
            window.alert('Unable to load swal. Please contact developer.')
            LanguageUtils.dispatchCustomEvent(Events.codebookRenamed, {err: err})
          } else {
            codebookName = LanguageUtils.normalizeString(codebookName)
            window.abwa.annotationServerManager.client.updateGroup(codebook.id, {
              name: codebookName,
              description: codebook.description || 'A Review&Go group to conduct a review'
            }, (err, codebook) => {
              if (err) {
                LanguageUtils.dispatchCustomEvent(Events.codebookRenamed, {err: err})
              } else {
                LanguageUtils.dispatchCustomEvent(Events.codebookRenamed, {group: codebook})
              }
            })
          }
        }
      })
    }
  }
}

module.exports = RenameCodebook
