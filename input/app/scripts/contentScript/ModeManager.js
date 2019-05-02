const $ = require('jquery')
const _ = require('lodash')
const LanguageUtils = require('../utils/LanguageUtils')
const Events = require('./Events')

class ModeManager {
  constructor (mode) {
    if (mode) {
      this.mode = mode
    } else {
      // If initialization based on annotation
      if (window.abwa.annotationBasedInitializer.initAnnotation) {
        // Set index mode
        this.mode = ModeManager.modes.index
        // Open sidebar
        window.abwa.sidebar.openSidebar()
      } else {
        this.mode = ModeManager.modes.highlight
      }
    }
  }

  init (callback) {
    this.loadSidebarToggle(() => {
      this.initEventHandlers(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      })
    })
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
    if (this.mode === ModeManager.modes.highlight) {
      this.setHighlightMode()
    } else {
      this.setIndexMode()
    }
  }

  setPanelText () {
    // Mode element
    let modeHeaderLabel = document.querySelector('#modeHeader label')
    modeHeaderLabel.innerText = chrome.i18n.getMessage('Mode')
    let modeLabel = document.querySelector('#modeLabel')
    if (this.mode === ModeManager.modes.highlight) {
      modeLabel.innerText = chrome.i18n.getMessage('highlight')
    } else {
      modeLabel.innerText = chrome.i18n.getMessage('index')
    }
  }

  setHighlightMode () {
    let annotatorToggle = document.querySelector('#annotatorToggle')
    let modeLabel = document.querySelector('#modeLabel')
    annotatorToggle.checked = true
    modeLabel.innerText = chrome.i18n.getMessage('highlight')
    this.mode = ModeManager.modes.highlight
  }

  setIndexMode () {
    let annotatorToggle = document.querySelector('#annotatorToggle')
    let modeLabel = document.querySelector('#modeLabel')
    annotatorToggle.checked = false
    modeLabel.innerText = chrome.i18n.getMessage('index')
    this.mode = ModeManager.modes.index
  }

  initEventHandlers (callback) {
    let annotatorToggle = document.querySelector('#annotatorToggle')
    annotatorToggle.addEventListener('click', (event) => {
      if (annotatorToggle.checked) {
        this.setHighlightMode()
      } else {
        this.setIndexMode()
      }
      LanguageUtils.dispatchCustomEvent(Events.modeChanged, {mode: this.mode})
    })
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

ModeManager.modes = {
  'highlight': 'highlight',
  'index': 'index'
}

module.exports = ModeManager
