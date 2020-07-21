import _ from 'lodash'
import UpdateSession from './Update/UpdateSession'
import CreateSession from './Create/CreateSession'
import ReadSession from './Read/ReadSession'



class SessionManager {
  constructor () {
    this.events = {}
    this.sessionCreator = new CreateSession()
    this.sessionReader = new ReadSession()
    this.sessionUpdater = new UpdateSession()
  }

  init (callback) {
    this.sessionReader.init(() => {
      this.sessionUpdater.init(() => {
        this.sessionCreator.init(() => {
          if (_.isFunction(callback)) {
            callback()
          }
        })
      })

    })
  }

  destroy (callback) {
    // Destroy annotation operators
    this.sessionCreator.destroy()
    this.sessionReader.destroy()
    this.sessionUpdater.destroy()
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }
}
export default SessionManager

