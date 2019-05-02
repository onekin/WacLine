const $ = require('jquery')
const _ = require('lodash')
const LanguageUtils = require('../utils/LanguageUtils')
const Events = require('./Events')

const RolesManager = require('./RolesManager')

class ModeManager {
  constructor (mode) {
    if (mode) {
      this.mode = mode
    }
  }

  init (callback) {
    if (window.abwa.rolesManager.role === RolesManager.roles.teacher) {
      if (window.abwa.annotationBasedInitializer.initAnnotation) {
        this.mode = ModeManager.modes.mark
        // Open sidebar
        window.abwa.sidebar.openSidebar()
      } else {
        this.mode = ModeManager.modes.evidencing
      }
      this.loadSidebarToggle(() => {
        this.initEventHandlers(() => {
          if (_.isFunction(callback)) {
            callback()
          }
        })
      })
    } else {
      this.mode = ModeManager.modes.view
      if (_.isFunction(callback)) {
        callback()
      }
    }
  }

  loadSidebarToggle (callback) {
    let sidebarURL = chrome.extension.getURL('pages/sidebar/annotatorMode.html')
    $.get(sidebarURL, (html) => {
      // Append sidebar to content
      $('#abwaSidebarContainer').append($.parseHTML(html))
      // Set toggle status
      this.setToggleStatus()
      // Set tags text
      this.setPanelText()
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  setToggleStatus () {
    if (this.mode === ModeManager.modes.evidencing) {
      this.setEvidencingMode()
    } else {
      this.setMarkingMode()
    }
  }

  setPanelText () {
    // Mode element
    let modeHeaderLabel = document.querySelector('#modeHeader label')
    modeHeaderLabel.innerText = chrome.i18n.getMessage('Mode')
    let modeLabel = document.querySelector('#modeLabel')
    if (this.mode === ModeManager.modes.evidencing) {
      modeLabel.innerText = chrome.i18n.getMessage('Evidencing')
    } else {
      modeLabel.innerText = chrome.i18n.getMessage('Marking')
    }
  }

  setEvidencingMode () {
    let annotatorToggle = document.querySelector('#annotatorToggle')
    let modeLabel = document.querySelector('#modeLabel')
    annotatorToggle.checked = false
    modeLabel.innerText = chrome.i18n.getMessage('Evidencing')
    this.mode = ModeManager.modes.evidencing
  }

  setMarkingMode () {
    let annotatorToggle = document.querySelector('#annotatorToggle')
    let modeLabel = document.querySelector('#modeLabel')
    annotatorToggle.checked = true
    modeLabel.innerText = chrome.i18n.getMessage('Marking')
    this.mode = ModeManager.modes.mark
  }

  setViewingMode () {
    this.mode = ModeManager.modes.view
  }

  initEventHandlers (callback) {
    let annotatorToggle = document.querySelector('#annotatorToggle')
    annotatorToggle.addEventListener('click', (event) => {
      if (annotatorToggle.checked) {
        this.setMarkingMode()
      } else {
        this.setEvidencingMode()
      }
      LanguageUtils.dispatchCustomEvent(Events.modeChanged, {mode: this.mode})
    })
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

ModeManager.modes = {
  'review': 'review', // Activated for the reviewer role
  'view': 'view' // Activated for the author
}

module.exports = ModeManager
