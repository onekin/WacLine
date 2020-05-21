import Events from '../../Events'
import _ from 'lodash'
import Alerts from '../../utils/Alerts'
import Session from '../Session.js'
import LanguageUtils from '../../utils/LanguageUtils'
import Config from '../../Config'



class UpdateSession {
  constructor () {
    this.events = {}
  }

  init (callback) {
    this.initSessionDeleteEvent()
    this.initSessionUpdateEvent()
    if (_.isFunction(callback)) {
      callback()
    }
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  initSessionUpdateEvent () {
    this.events.updateSessionEvent = { element: document, event: Events.updateSession, handler: this.updateSessionEventHandler() }
    this.events.updateSessionEvent.element.addEventListener(this.events.updateSessionEvent.event, this.events.updateSessionEvent.handler, false)
  }

  initSessionDeleteEvent () {
    this.events.deleteSessionEvent = { element: document, event: Events.deleteSession, handler: this.deleteSessionEventHandler() }
    this.events.deleteSessionEvent.element.addEventListener(this.events.deleteSessionEvent.event, this.events.deleteSessionEvent.handler, false)
  }

  updateSessionEventHandler () {
    return (event) => {
      let session = event.detail.session
      window.abwa.annotationServerManager.client.updateAnnotation(
        session.id,
        session.toAnnotation(),
        (err, session) => {
          if (err) {
            Alerts.errorAlert({ text: 'Unexpected error, unable to update annotation' })
          } else {
            session = Session.deserialize(session)
            LanguageUtils.dispatchCustomEvent(Events.sessionUpdated, { session: session })
          }
        })
    }
  }

  deleteSessionEventHandler () {
    return (event) => {
      let session = event.detail.session
      Alerts.confirmAlert({
        alertType: Alerts.alertType.question,
        title: 'Delete session',
        text: 'Are you sure you want to delete current session?',
        callback: () => {
          Alerts.confirmAlert({
            alertType: Alerts.alertType.question,
            title: 'Transfer annotations',
            text: 'Do you want to transfer the annotations to another session?',
            callback: () => {
              let html = ''
              let selectOp = document.createElement('select')
              selectOp.id = 'transSessionSelect'
              window.abwa.sessionManagement.sessionReader.sessions.forEach((sess) => {
                if (sess.id !== session.id) {
                  let option = document.createElement('option')
                  option.value = sess.id
                  option.text = sess.sessionName
                  selectOp.appendChild(option)
                }
              })
              html += selectOp.outerHTML

              Alerts.multipleInputAlert({
                title: 'Select the session to transfer the annotations',
                html: html,
                preConfirm: () => {
                  let sessionTarget = document.querySelector('#transSessionSelect').value
                  let newSessionTag = Config.namespace + ':session:' + sessionTarget
                  let sessionTargetOb = window.abwa.sessionManagement.sessionReader.sessions.filter(sess => sess.id === sessionTarget)[0]
                  window.abwa.sessionManagement.sessionReader.currentSession.sessionURIs.forEach((uri) => {
                    if (sessionTargetOb.sessionURIs.filter(ur => ur.source === uri.source).length < 1) {
                      sessionTargetOb.sessionURIs.push(uri)
                    }
                  })
                  LanguageUtils.dispatchCustomEvent(Events.updateSession, { session: sessionTargetOb })
                  LanguageUtils.dispatchCustomEvent(Events.transferCurrentSessionAnnotations, { fromSession: session, newTag: newSessionTag })
                  window.abwa.annotationServerManager.client.deleteAnnotation(session.id, (err, _result) => {
                    if (err) {
                      console.log(err)
                    } else {
                      LanguageUtils.dispatchCustomEvent(Events.sessionDeleted, {})
                    }
                  })
                }
              })
            },
            cancelCallback: () => {
              window.abwa.annotationServerManager.client.deleteAnnotation(session.id, (err, _result) => {
                if (err) {
                  console.log(err)
                } else {
                  LanguageUtils.dispatchCustomEvent(Events.sessionDeleted, {})
                }
              })

            }
          })
        }
      })
    }
  }
}

export default UpdateSession
