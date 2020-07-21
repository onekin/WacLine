import Events from '../../Events'
import _ from 'lodash'
import LanguageUtils from '../../utils/LanguageUtils'
import Alerts from '../../utils/Alerts'
import Session from '../Session.js'
import DocxExporter from '../../docxExporter/DocxExporter'


class CreateSession {
  constructor () {
    this.events = {}
  }

  // Añadir callbacks en los inicion de los modulos de SessionManagement
  init (callback) {
    // Add event listener for createSession event
    this.initCreateSessionEvent()
    this.newSessionButton = document.querySelector('#newSessionButton')
    this.newSessionButton.addEventListener('click', () => { this.createNewSessionForm() })
    // Check if already the user has a session
    if (window.abwa.sessionManagement.sessionReader.sessions.length < 1) {
      this.createNewSessionForm()
    }
    if (_.isFunction(callback)) {
      callback()
    }

  }

  initCreateSessionEvent (callback) {
    this.events.createSessionEvent = { element: document, event: Events.createSession, handler: this.createSessionEventHandler() }
    this.events.createSessionEvent.element.addEventListener(this.events.createSessionEvent.event, this.events.createSessionEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createSessionEventHandler () {
    return (event) => {
      const sessionName = event.detail.sessionName
      if (sessionName) {
        let sessionToCreate = new Session({ sessionName: sessionName, group: window.abwa.groupSelector.currentGroup.id })
        window.abwa.annotationServerManager.client.createNewAnnotation(sessionToCreate.toAnnotation(), (err, sessionAnnotated) => {
          if (err) {
            Alerts.errorAlert({ text: 'Unexpected error, unable to create session' })
          } else {
            let session = Session.deserialize(sessionAnnotated)
            LanguageUtils.dispatchCustomEvent(Events.sessionCreated, { session: session })
          }
        })
      }
    }
  }

  createNewSessionForm () {
    Alerts.multipleInputAlert({
      title: 'Create new session',
      html: '<input autofocus swal2-input type="text" id="sessionName" placeholder="New session name" value="">',
      preConfirm: () => {
        const name = document.querySelector('#sessionName').value
        LanguageUtils.dispatchCustomEvent(Events.createSession, { sessionName: name })
      }
    })
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  // TODO: Se crea la session falta -> Event.sessionCreated que actualiza la lista de sessiones y la añade como seleccionada (EN READ SESSION)
  // Actualizar una session significa que la lista de uris de la session ha cambiado

}
export default CreateSession
