const $ = require('jquery')
const _ = require('lodash')

class Sidebar {
  init (callback) {
    this.initSidebarStructure(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  initSidebarStructure (callback) {
    let sidebarURL = chrome.extension.getURL('pages/sidebar/sidebar.html')
    $.get(sidebarURL, (html) => {
      this.waitUntilBodyLoads(() => {
        // Append sidebar to content
        $('body').append($.parseHTML(html))
        // Initialize sidebar labels
        this.initSidebarLabels()
        // Initialize sidebar toggle button
        this.initSidebarButton()
        if (_.isFunction(callback)) {
          callback()
        }
      })
    })
  }

  waitUntilBodyLoads (callback) {
    let counter = 0
    let checkBodyLoads = () => {
      if (_.isElement(document.body)) {
        callback()
      } else {
        if (counter === 1000) {
          console.error('The webpage is not loaded after 50 seconds, reload the webpage.')
        } else {
          counter++
          setTimeout(checkBodyLoads, 50)
        }
      }
    }
    checkBodyLoads()
  }

  initSidebarLabels () {}

  initSidebarButton () {
    let sidebarButton = document.querySelector('#abwaSidebarButton')
    sidebarButton.addEventListener('click', () => {
      this.toggleSidebar()
    })
  }

  toggleSidebar () {
    let sidebarButton = document.querySelector('#abwaSidebarButton')
    sidebarButton.dataset.toggled = sidebarButton.dataset.toggled !== 'true'
    document.documentElement.dataset.sidebarShown = sidebarButton.dataset.toggled
    document.querySelector('#abwaSidebarContainer').dataset.shown = sidebarButton.dataset.toggled
  }

  openSidebar () {
    let sidebarButton = document.querySelector('#abwaSidebarButton')
    sidebarButton.dataset.toggled = 'true'
    document.documentElement.dataset.sidebarShown = sidebarButton.dataset.toggled
    document.querySelector('#abwaSidebarContainer').dataset.shown = sidebarButton.dataset.toggled
  }

  closeSidebar () {
    let sidebarButton = document.querySelector('#abwaSidebarButton')
    sidebarButton.dataset.toggled = 'false'
    document.documentElement.dataset.sidebarShown = sidebarButton.dataset.toggled
    document.querySelector('#abwaSidebarContainer').dataset.shown = sidebarButton.dataset.toggled
  }

  destroy (callback) {
    $('#abwaSidebarWrapper').remove()
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

module.exports = Sidebar
