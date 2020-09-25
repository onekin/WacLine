import $ from 'jquery'
import _ from 'lodash'
import Events from '../../Events'
import LanguageUtils from '../../utils/LanguageUtils'

class UserFilter {
  constructor () {
    this.filteredUsers = [] // Includes only the users that are filtered by
    this.allUsers = [] // Includes all the users that have created annotation in the document
    this.events = {}
    this.userFilterWrapper = null
    this.usersContainer = null
  }

  init (callback) {
    console.debug('Initializing UserFilter')
    this.initUserFilterStructure((err) => {
      if (err) {
        // Handle error
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Annotations updated event handler
        this.initAnnotationsUpdatedEventHandler()
        // Init event handler when click in all
        this.initAllFilter()
        // Init panel construction
        this.initUsersPanel()
        console.debug('Initialized UserFilter')
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  addFilteredUser (user) {
    // If the user is not in the all users list
    if (_.isArray(this.allUsers) && !_.find(this.allUsers, user)) {
      this.allUsers.push(user)
    }
    // Add the user to the filter if it is filtered
    if (_.isArray(this.filteredUsers)) {
      if (!_.find(this.filteredUsers, user)) {
        this.filteredUsers.push(user)
        return true
      }
    }
  }

  initUserFilterStructure (callback) {
    const tagWrapperUrl = chrome.extension.getURL('pages/sidebar/userFilterWrapper.html')
    $.get(tagWrapperUrl, (html) => {
      this.sidebarContainer = document.querySelector('#abwaSidebarContainer')
      // Insert user filter after toolset
      this.sidebarContainer.querySelector('#toolset').insertAdjacentHTML('afterend', html)
      this.userFilterWrapper = document.querySelector('#userFilterWrapper')
      this.usersContainer = document.querySelector('#usersContainer')
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
    const allFilter = document.querySelector('#userFilter_all')
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
  }

  activateAll () {
    const checkboxes = this.usersContainer.querySelectorAll('input')
    this.filteredUsers = _.clone(this.allUsers)
    // Activate all the checkboxes
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true
      $(checkbox).attr('checked', 'true')
    })
  }

  deactivateAll () {
    const checkboxes = this.usersContainer.querySelectorAll('input')
    this.filteredUsers = []
    // Deactivate all the checkboxes
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false
      $(checkbox).removeAttr('checked')
    })
  }

  initAnnotationsUpdatedEventHandler (callback) {
    this.events.updatedAllAnnotations = { element: document, event: Events.updatedAllAnnotations, handler: this.createUpdatedAllAnnotationsEventHandler() }
    this.events.updatedAllAnnotations.element.addEventListener(this.events.updatedAllAnnotations.event, this.events.updatedAllAnnotations.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createUpdatedAllAnnotationsEventHandler () {
    return (event) => {
      // Retrieve all annotations
      let annotations = []
      if (_.hasIn(event, 'detail.annotations')) {
        annotations = event.detail.annotations // If is included in the event
      } else {
        annotations = window.abwa.annotationManagement.annotationReader.allAnnotations // Or retrieve directly from annotator reader
      }
      this.updateUsersPanel(annotations)
    }
  }

  initUsersPanel () {
    const annotations = window.abwa.annotationManagement.annotationReader.allAnnotations
    if (_.isArray(annotations)) {
      // Retrieve users who had annotated the document
      this.allUsers = _.uniq(_.map(annotations, (annotation) => {
        return annotation.creator
      }))
      this.filteredUsers = _.clone(this.allUsers)
      // Upload sidebar panel with users
      this.usersContainer.innerHTML = '' // Empty the container
      for (let i = 0; i < this.allUsers.length; i++) {
        $(this.usersContainer).append(this.createUserFilterElement(this.allUsers[i]))
      }
      // Activate all users
      const checkboxes = this.usersContainer.querySelectorAll('input')
      for (let i = 0; i < checkboxes.length; i++) {
        const currentCheckbox = checkboxes[i]
        currentCheckbox.checked = true
      }
      // If all old filtered users are current all users, just activate all of them
      this.checkAllActivated()
    }
  }

  updateUsersPanel (annotations) {
    if (_.isArray(annotations)) {
      // Retrieve users who had annotated the document
      this.allUsers = _.uniq(_.map(annotations, (annotation) => {
        return annotation.creator
      }))
      // Upload sidebar panel with users
      this.usersContainer.innerHTML = '' // Empty the container
      for (let i = 0; i < this.allUsers.length; i++) {
        $(this.usersContainer).append(this.createUserFilterElement(this.allUsers[i]))
      }
      // Activate users which where previously activated (and remove if no user is found from this.allUsers and this.filteredUsers)
      const checkboxes = this.usersContainer.querySelectorAll('input')
      for (let i = 0; i < checkboxes.length; i++) {
        const currentCheckbox = checkboxes[i]
        if (_.isString(_.find(this.filteredUsers, (oldUser) => {
          return LanguageUtils.normalizeStringToValidID(oldUser) === currentCheckbox.id.replace('userFilter_', '')
        }))) {
          currentCheckbox.checked = true
        }
      }
      // If all old filtered users are current all users, just activate all of them
      this.checkAllActivated()
    }
  }

  createUserFilterElement (name) {
    const userFilterTemplate = document.querySelector('#userFilterTemplate')
    const userFilterElement = $(userFilterTemplate.content.firstElementChild).clone().get(0)
    // Set text and properties for label and input
    const input = userFilterElement.querySelector('input')
    input.id = 'userFilter_' + LanguageUtils.normalizeStringToValidID(name)
    const label = userFilterElement.querySelector('label')
    label.innerText = name.replace(window.abwa.annotationServerManager.annotationServerMetadata.userUrl, '')
    label.htmlFor = 'userFilter_' + LanguageUtils.normalizeStringToValidID(name)
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

  /**
   * Activate "All" checkbox if all the users' checkboxes are activated
   */
  checkAllActivated () {
    const allCheckboxes = this.usersContainer.querySelectorAll('input')
    const deactivatedCheckboxes = _.find(allCheckboxes, (checkbox) => { return checkbox.checked === false })
    if (_.isUndefined(deactivatedCheckboxes)) { // There are not found any deactivated checkboxes
      document.querySelector('#userFilter_all').checked = true
    }
  }

  dispatchFilterChanged () {
    LanguageUtils.dispatchCustomEvent(Events.userFilterChange, { filteredUsers: this.filteredUsers })
  }

  destroy () {
    // Remove observer
    // clearInterval(this.observerInterval)
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    // Remove user filter container from sidebar
    if (_.isElement(this.userFilterWrapper)) {
      this.userFilterWrapper.remove()
    }
  }
}

export default UserFilter
