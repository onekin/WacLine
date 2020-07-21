import Events from '../../Events'
import _ from 'lodash'
import LanguageUtils from '../../utils/LanguageUtils'
import Session from '../Session.js'
import Config from '../../Config'
import axios from 'axios'
import $ from 'jquery'
import Alerts from '../../utils/Alerts'
require('jquery-contextmenu/dist/jquery.contextMenu')

class ReadSession {
  constructor () {
    this.page = chrome.extension.getURL('pages/sidebar/documentControl.html')
    this.events = {}
  }

  init (callback) {
    this.initSessionCreatedEventListener()
    this.initSessionUpdatedEventListener()
    this.initSessionDeletedEventListener()
    this.loadSessions(() => {
      this.renderSessionContainer(() => {
        if (this.sessions.length > 0) {
          this.setCurrentSession(this.sessions[0], callback())
        } else {
          if (_.isFunction(callback)) {
            callback()
          }
        }
      })


    })
  }

  destroy () {
    // Remove session container
    $('#sessionContainer').remove()
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  renderSessionContainer (callback) {
    axios.get(this.page).then((response) => {
      this.sidebarContainer = document.querySelector('#abwaSidebarContainer')
      this.sidebarContainer.insertAdjacentHTML('beforeend', response.data)
      this.uriContainer = this.sidebarContainer.querySelector('#documentsContainer')
      this.sessionSelector = this.sidebarContainer.querySelector('#sessionSelector')
      this.sessionSelector.addEventListener('change', () => { this.onSelectChange(this.sessionSelector.value) })
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  onSelectChange (id) {
    let session = this.sessions.find((session) => { return session.id === id })
    LanguageUtils.dispatchCustomEvent(Events.updateSession, { session: session })
  }

  initSessionUpdatedEventListener () {
    this.events.sessionUpdatedEvent = { element: document, event: Events.sessionUpdated, handler: this.updatedSessionHandler() }
    this.events.sessionUpdatedEvent.element.addEventListener(this.events.sessionUpdatedEvent.event, this.events.sessionUpdatedEvent.handler, false)
  }

  initSessionCreatedEventListener () {
    this.events.sessionCreatedEvent = { element: document, event: Events.sessionCreated, handler: this.createdSessionHandler() }
    this.events.sessionCreatedEvent.element.addEventListener(this.events.sessionCreatedEvent.event, this.events.sessionCreatedEvent.handler, false)
  }

  initSessionDeletedEventListener () {
    this.events.sessionDeletedEvent = { element: document, event: Events.sessionDeleted, handler: this.deletedSessionHandler() }
    this.events.sessionDeletedEvent.element.addEventListener(this.events.sessionDeletedEvent.event, this.events.sessionDeletedEvent.handler, false)
  }

  deletedSessionHandler () {
    return (event) => {
      this.loadSessions(() => {
        if (this.sessions.length > 0) {
          this.setCurrentSession(this.sessions[0])
        } else {
          this.reloadSessionContainer()
        }
      })
    }
  }

  createdSessionHandler () {
    return (event) => {
      this.sessions.push(event.detail.session)
      this.setCurrentSession(event.detail.session)
    }
  }

  updatedSessionHandler () {
    return (event) => {
      this.setCurrentSession(event.detail.session)
      window.abwa.annotationManagement.annotationReader.updateAllAnnotations()
    }
  }

  setCurrentSession (session, callback) {
    this.currentSession = session
    this.reloadSessionContainer()
    if (!_.isUndefined(session)) {
      session.sessionURIs.forEach((uri) => {
        let uributton = document.createElement('button')
        uributton.setAttribute('data-sessionURI-source', uri.source)
        uributton.innerText = uri.title
        uributton.addEventListener('click', () => { window.open(uri.source) })
        this.uriContainer.appendChild(uributton)
        this.createContextMenuForSessionURI(uri)
      })
    }

    if (_.isFunction(callback)) {
      callback()
    }
  }

  reloadSessionContainer () {
    this.sidebarContainer = document.querySelector('#abwaSidebarContainer')
    this.uriContainer = this.sidebarContainer.querySelector('#documentsContainer')
    this.sessionSelector = this.sidebarContainer.querySelector('#sessionSelector')
    this.sessionSelector.setAttribute('data-session-selector', 'sessionSelector')
    this.sessionSelector.innerHTML = ''
    this.uriContainer.innerHTML = ''
    this.createContextMenuForSession()
    this.sessions.forEach((session) => {
      let option = document.createElement('option')
      option.text = session.sessionName
      option.value = session.id
      if (!_.isUndefined(this.currentSession) && session.id === this.currentSession.id) {
        option.setAttribute('selected', '')
      }
      this.sessionSelector.appendChild(option)
    })
  }


  createContextMenuForSessionURI (uri) {
    $.contextMenu({
      selector: '[data-sessionURI-source="' + uri.source + '"]',
      build: () => {
        const items = {}
        // Delete uri
        items.delete = { name: 'Delete' }
        return {
          callback: (key, opt) => {
            if (key === 'delete') {
              this.currentSession.sessionURIs = this.currentSession.sessionURIs.filter((curi) => { return uri.source !== curi.source })
              LanguageUtils.dispatchCustomEvent(Events.updateSession, { session: this.currentSession })
            }
          },
          items: items
        }
      }
    })
  }

  createContextMenuForSession () {
    $.contextMenu({
      selector: '[data-session-selector="sessionSelector"]',
      build: () => {
        let session = this.sessions.filter(s => s.id === document.querySelector('[data-session-selector="sessionSelector"]').value)[0]
        const items = {}
        // Rename session
        items.rename = { name: 'Rename' }
        // Delete session
        items.delete = { name: 'Delete' }
        return {
          callback: (key, opt) => {
            if (key === 'delete') {
              LanguageUtils.dispatchCustomEvent(Events.deleteSession, { session: session })
            } else if (key === 'rename') {
              this.renameSessionForm(session)
            }
          },
          items: items
        }
      }
    })
  }

  renameSessionForm (session) {
    Alerts.multipleInputAlert({
      title: 'Reaname current session',
      html: '<input type="text" id="newSessionName" placeholder="New Session Name">',
      preConfirm: () => {
        let newName = document.querySelector('#newSessionName').value
        session.sessionName = newName
        LanguageUtils.dispatchCustomEvent(Events.updateSession, { session: session })
      }
    })
  }


  loadSessions (callback) {
    this.retrieveSessions((err, sessions) => {
      if (err) {
        // Unable retrieve Sessions
      } else {
        this.sessions = sessions
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  retrieveSessions (callback) {
    let promise = new Promise((resolve, reject) => {
      let call = {}
      call.group = window.abwa.groupSelector.currentGroup.id
      call.order = 'asc'
      call.sort = 'updated'
      call.tag = Config.namespace + ':isSession'
      window.abwa.annotationServerManager.client.searchAnnotations(call, (err, sessionObjects) => {
        if (err) {
          reject(err)
        } else {
          // console.log(sessionObjects)
          let sessions = sessionObjects.map((session) => Session.deserialize(session))
          sessions = _.orderBy(sessions, 'updated', 'desc')
          console.log(sessions)
          resolve(sessions)
        }
      })
    })
    promise.catch((err) => {
      callback(err)
    }).then((annotations) => {
      callback(null, annotations)
    })
  }

}
export default ReadSession
