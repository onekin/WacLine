import Events from '../../../Events'
import Alerts from '../../../utils/Alerts'
import LanguageUtils from '../../../utils/LanguageUtils'
import _ from 'lodash'

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
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  // EVENTS
  initDeleteCodebookEvent () {
    this.events.deleteCodebookEvent = { element: document, event: Events.deleteCodebook, handler: this.deleteCodebookEventHandler() }
    this.events.deleteCodebookEvent.element.addEventListener(this.events.deleteCodebookEvent.event, this.events.deleteCodebookEvent.handler, false)
  }

  deleteCodebookEventHandler () {
    return (event) => {
      const codebook = event.detail.codebook
      const user = event.detail.user
      Alerts.confirmAlert({
        title: 'Deleting annotation group ' + codebook.name,
        text: 'Are you sure that you want to delete this group? Codebook and all the annotations done in all the documents will be erased.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          window.abwa.annotationServerManager.client.removeAMemberFromAGroup({ id: codebook.id, user: user }, (err) => {
            if (err) {
              LanguageUtils.dispatchCustomEvent(Events.codebookDeleted, { err: err })
            } else {
              LanguageUtils.dispatchCustomEvent(Events.codebookDeleted, { group: codebook })
            }
          })
        }
      })
    }
  }
}

export default DeleteCodebook
