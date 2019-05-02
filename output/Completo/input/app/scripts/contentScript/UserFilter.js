const $ = require('jquery')
const _ = require('lodash')
const Events = require('./Events')
const ModeManager = require('./ModeManager')
const LanguageUtils = require('../utils/LanguageUtils')

class UserFilter {
  constructor () {
    this.filteredUsers = null
    this.allUsers = []
    this.events = {}
    this.userFilterWrapper = null
    this.usersContainer = null
  }

  init (callback) {
    this.initUserFilterStructure((err) => {
      if (err) {
        // Handle error
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Init mode change event handler
        this.initModeChangeEventHandler()
        // Annotations updated event handler
        this.initAnnotationsUpdatedEventHandler()
        // Init event handler when click in all
        this.initAllFilter()
        if (_.isFunction(callback)) {
          callback()
        }
        // Init panel construction (if no annotation event is detected)
        this.initUsersPanel(window.abwa.contentAnnotator.allAnnotations)
      }
    })
  }

  initUserFilterStructure (callback) {
    let tagWrapperUrl = chrome.extension.getURL('pages/sidebar/userFilterWrapper.html')
    $.get(tagWrapperUrl, (html) => {
      $('#modeWrapper').after($.parseHTML(html))
      this.userFilterWrapper = document.querySelector('#userFilterWrapper')
      this.usersContainer = document.querySelector('#usersContainer')
      if (window.abwa.modeManager.mode === ModeManager.modes.index) {
        this.showUserFilterContainer()
        this.activateAll() // Activate all the filters
      } else if (window.abwa.modeManager.mode === ModeManager.modes.highlight) {
        this.hideUserFilterContainer()
      }
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  hideUserFilterContainer () {
    $(this.userFilterWrapper).hide()
  }

  showUserFilterContainer () {
    $(this.userFilterWrapper).show()
  }

  initAllFilter () {
    let allFilter = document.querySelector('#userFilter_all')
    allFilter.checked = true
    // Init event handler on change all filter
    allFilter.addEventListener('change', (event) => {
      if (event.target.checked) {
        this.activateAll()
      } else {
        this.deactivateAll()
      }
      // Dispatch event user filter has changed
      this.dispatchFilterChanged()
    })
    let initialEventListener = () => {
      this.activateAll()
      document.removeEventListener(Events.updatedAllAnnotations, initialEventListener)
    }
    document.addEventListener(Events.updatedAllAnnotations, initialEventListener)
  }

  activateAll () {
    let checkboxes = this.usersContainer.querySelectorAll('input')
    this.filteredUsers = _.clone(this.allUsers)
    // Activate all the checkboxes
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true
      $(checkbox).attr('checked', 'true')
    })
  }

  deactivateAll () {
    let checkboxes = this.usersContainer.querySelectorAll('input')
    this.filteredUsers = []
    // Deactivate all the checkboxes
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false
      $(checkbox).removeAttr('checked')
    })
  }

  initModeChangeEventHandler (callback) {
    this.events.modeChangeEvent = {element: document, event: Events.modeChanged, handler: this.createInitModeChangeEventHandler()}
    this.events.modeChangeEvent.element.addEventListener(this.events.modeChangeEvent.event, this.events.modeChangeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initAnnotationsUpdatedEventHandler (callback) {
    this.events.updatedAllAnnotations = {element: document, event: Events.updatedAllAnnotations, handler: this.createUpdatedAllAnnotationsEventHandler()}
    this.events.updatedAllAnnotations.element.addEventListener(this.events.updatedAllAnnotations.event, this.events.updatedAllAnnotations.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createInitModeChangeEventHandler () {
    return () => {
      // If mode is index, show sidebar panel, else hide
      if (window.abwa.modeManager.mode === ModeManager.modes.index) {
        this.showUserFilterContainer()
      } else {
        this.hideUserFilterContainer()
      }
    }
  }

  createUpdatedAllAnnotationsEventHandler () {
    return (event) => {
      // Retrieve all annotations
      let annotations = []
      if (_.has(event, 'detail.annotations')) {
        annotations = event.detail.annotations // If is included in the event
      } else {
        annotations = window.abwa.contentAnnotator.allAnnotations // Or retrieve directly from contentAnnotator
      }
      this.updateUsersPanel(annotations)
    }
  }

  initUsersPanel () {
    let annotations = window.abwa.contentAnnotator.allAnnotations
    if (_.isArray(annotations)) {
      // Retrieve users who had annotated the document
      this.allUsers = _.uniq(_.map(annotations, (annotation) => {
        return annotation.user.replace('acct:', '').replace('@hypothes.is', '')
      }))
      this.filteredUsers = _.clone(this.allUsers)
      // Upload sidebar panel with users
      this.usersContainer.innerHTML = '' // Empty the container
      for (let i = 0; i < this.allUsers.length; i++) {
        $(this.usersContainer).append(this.createUserFilterElement(this.allUsers[i]))
      }
      // Activate all users
      let checkboxes = this.usersContainer.querySelectorAll('input')
      for (let i = 0; i < checkboxes.length; i++) {
        let currentCheckbox = checkboxes[i]
        currentCheckbox.checked = true
      }
      // If all old filtered users are current all users, just activate all of them
      this.checkAllActivated()
    }
  }

  updateUsersPanel (annotations) {
    if (_.isArray(annotations)) {
      let oldFilteredUsers = _.clone(this.filteredUsers)
      // Retrieve users who had annotated the document
      this.allUsers = _.uniq(_.map(annotations, (annotation) => {
        return annotation.user.replace('acct:', '').replace('@hypothes.is', '')
      }))
      this.filteredUsers = _.clone(this.allUsers)
      // Upload sidebar panel with users
      this.usersContainer.innerHTML = '' // Empty the container
      for (let i = 0; i < this.allUsers.length; i++) {
        $(this.usersContainer).append(this.createUserFilterElement(this.allUsers[i]))
      }
      // Activate users which where previously activated (and remove if no user is found from this.allUsers and this.filteredUsers)
      let checkboxes = this.usersContainer.querySelectorAll('input')
      for (let i = 0; i < checkboxes.length; i++) {
        let currentCheckbox = checkboxes[i]
        if (_.isString(_.find(oldFilteredUsers, (oldUser) => {
          return oldUser === currentCheckbox.id.replace('userFilter_', '')
        }))) {
          currentCheckbox.checked = true
        }
      }
      // If all old filtered users are current all users, just activate all of them
      this.checkAllActivated()
    }
  }

  createUserFilterElement (name) {
    let userFilterTemplate = document.querySelector('#userFilterTemplate')
    let userFilterElement = $(userFilterTemplate.content.firstElementChild).clone().get(0)
    // Set text and properties for label and input
    let input = userFilterElement.querySelector('input')
    input.id = 'userFilter_' + name
    let label = userFilterElement.querySelector('label')
    label.innerText = name
    label.htmlFor = 'userFilter_' + name
    // Set event handler for input check status
    input.addEventListener('change', (event) => {
      // Update filtered array
      if (event.target.checked) {
        // Add to filtered elements
        if (!_.includes(this.filteredUsers, name)) {
          this.filteredUsers.push(name)
        }
        // Activate all filter if all users are selected
        this.checkAllActivated()
      } else {
        // Remove from filtered elements
        _.pull(this.filteredUsers, name)
        // Deactivate all filter
        document.querySelector('#userFilter_all').checked = false
      }
      // Dispatch filter changed
      this.dispatchFilterChanged()
    })
    return userFilterElement
  }

  checkAllActivated () {
    let allCheckboxes = this.usersContainer.querySelectorAll('input')
    let deactivatedCheckboxes = _.find(allCheckboxes, (checkbox) => { return checkbox.checked === false })
    if (_.isUndefined(deactivatedCheckboxes)) { // There are not found any deactivated checkboxes
      document.querySelector('#userFilter_all').checked = true
    }
  }

  dispatchFilterChanged () {
    LanguageUtils.dispatchCustomEvent(Events.userFilterChange, {filteredUsers: this.filteredUsers})
  }

  destroy () {
    // Remove observer
    // clearInterval(this.observerInterval)
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    // Remove user filter container from sidebar
    $(this.userFilterContainer).remove()
  }
}

module.exports = UserFilter
