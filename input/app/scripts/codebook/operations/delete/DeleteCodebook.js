const Events = require('../../../Events')
const Alerts = require('../../../utils/Alerts')
const LanguageUtils = require('../../../utils/LanguageUtils')
const _ = require('lodash')

class DeleteCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for deleteCodebook event
    this.initDeleteCodebookEvent()
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  // EVENTS
  initDeleteCodebookEvent () {
    this.events.deleteCodebookEvent = {element: document, event: Events.deleteCodebook, handler: this.deleteCodebookEventHandler()}
    this.events.deleteCodebookEvent.element.addEventListener(this.events.deleteCodebookEvent.event, this.events.deleteCodebookEvent.handler, false)
  }

  deleteCodebookEventHandler () {
    return (event) => {
      let codebook = event.detail.codebook
      let user = event.detail.user
      Alerts.confirmAlert({
        title: 'Deleting review model ' + codebook.name,
        text: 'Are you sure that you want to delete the review model. You will lose all the review model and all the annotations done with this review model in all the documents.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          window.abwa.annotationServerManager.client.removeAMemberFromAGroup({id: codebook.id, user: user}, (err) => {
            if (err) {
              LanguageUtils.dispatchCustomEvent(Events.codebookDeleted, {err: err})
            } else {
              LanguageUtils.dispatchCustomEvent(Events.codebookDeleted, {group: codebook})
            }
          })
        }
      })
    }
  }
}

module.exports = DeleteCodebook
