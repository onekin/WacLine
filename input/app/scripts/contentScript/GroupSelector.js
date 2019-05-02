const ChromeStorage = require('../utils/ChromeStorage')
const LanguageUtils = require('../utils/LanguageUtils')
const _ = require('lodash')
const $ = require('jquery')

const selectedGroupNamespace = 'hypothesis.currentGroup'
const defaultGroup = {id: '__world__', name: 'Public', public: true}

const checkHypothesisLoggedInWhenPromptInSeconds = 2 // When not logged in, check if user has logged in

class GroupSelector {
  constructor () {
    this.currentGroup = null
    this.user = {}
  }

  init (callback) {
    console.debug('Initializing group selector')
    this.addGroupSelectorToSidebar(() => {
      this.reloadGroupsContainer(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      })
    })
  }

  addGroupSelectorToSidebar (callback) {
    let sidebarURL = chrome.extension.getURL('pages/sidebar/groupSelection.html')
    $.get(sidebarURL, (html) => {
      // Append sidebar to content
      $('#abwaSidebarContainer').append($.parseHTML(html))
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  /**
   * If not current group set, load from chrome storage last session
   * @param callback
   */
  defineCurrentGroup (callback) {
    // If initialization annotation is set
    if (window.abwa.annotationBasedInitializer.initAnnotation) {
      let annotationGroupId = window.abwa.annotationBasedInitializer.initAnnotation.group
      // Load group of annotation
      this.retrieveHypothesisGroups((err, groups) => {
        if (err) {
          if (_.isFunction(callback)) {
            callback(err)
          }
        } else {
          // Set current group
          this.currentGroup = _.find(groups, (group) => { return group.id === annotationGroupId })
          // Save to chrome storage current group
          ChromeStorage.setData(selectedGroupNamespace, {data: JSON.stringify(this.currentGroup)}, ChromeStorage.local)
          if (_.isFunction(callback)) {
            callback()
          }
        }
      })
    } else { // If initialization annotation is not set
      if (!this.currentGroup) {
        // Retrieve last saved group
        ChromeStorage.getData(selectedGroupNamespace, ChromeStorage.local, (err, savedCurrentGroup) => {
          if (err) {
            if (_.isFunction(callback)) {
              callback(new Error('Unable to retrieve current selected group'))
            }
          } else {
            // Parse chrome storage result
            if (!_.isEmpty(savedCurrentGroup) && savedCurrentGroup.data) {
              this.currentGroup = JSON.parse(savedCurrentGroup.data)
            } else {
              this.currentGroup = defaultGroup
            }
            if (_.isFunction(callback)) {
              callback()
            }
          }
        })
      } else {
        if (_.isFunction(callback)) {
          callback()
        }
      }
    }
  }

  reloadGroupsContainer (callback) {
    if (window.abwa.hypothesisClientManager.isLoggedIn()) {
      // Hide login/sign up form
      $('#notLoggedInGroupContainer').attr('aria-hidden', 'true')
      // Display group container
      $('#loggedInGroupContainer').attr('aria-hidden', 'false')
      // Set current group if not defined
      this.defineCurrentGroup(() => {
        // Render groups container
        this.renderGroupsContainer(() => {
          if (_.isFunction(callback)) {
            callback()
          }
        })
      })
    } else {
      // Display login/sign up form
      $('#notLoggedInGroupContainer').attr('aria-hidden', 'false')
      // Hide group container
      $('#loggedInGroupContainer').attr('aria-hidden', 'true')
      // Hide purposes wrapper
      $('#purposesWrapper').attr('aria-hidden', 'true')
      // Init isLogged checking
      this.initIsLoggedChecking()
      // Open the sidebar to show that login is required
      window.abwa.sidebar.openSidebar()
      if (_.isFunction(callback)) {
        callback()
      }
    }
  }

  initIsLoggedChecking () {
    // Check if user has been logged in
    this.loggedInInterval = setInterval(() => {
      chrome.runtime.sendMessage({scope: 'hypothesis', cmd: 'getToken'}, (token) => {
        if (!_.isNull(token)) {
          // Reload the web page
          window.location.reload()
        }
      })
    }, checkHypothesisLoggedInWhenPromptInSeconds * 1000)
  }

  renderGroupsContainer (callback) {
    // Display group selector and purposes selector
    $('#purposesWrapper').attr('aria-hidden', 'false')
    // Retrieve groups
    this.retrieveHypothesisGroups((groups) => {
      console.debug(groups)
      let dropdownMenu = document.querySelector('#groupSelector')
      dropdownMenu.innerHTML = '' // Remove all groups
      this.user.groups.forEach(group => {
        let groupSelectorItem = document.createElement('option')
        groupSelectorItem.dataset.groupId = group.id
        groupSelectorItem.innerText = group.name
        groupSelectorItem.className = 'dropdown-item'
        dropdownMenu.appendChild(groupSelectorItem)
      })
      // Set select option
      $('#groupSelector').find('option[data-group-id="' + this.currentGroup.id + '"]').prop('selected', 'selected')
      // Set event handler for group change
      this.setEventForGroupSelectChange()
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  retrieveHypothesisGroups (callback) {
    window.abwa.hypothesisClientManager.hypothesisClient.getUserProfile((err, profile) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        this.user = profile
        if (_.isFunction(callback)) {
          callback(null, profile.groups)
        }
      }
    })
  }

  setEventForGroupSelectChange () {
    let menu = document.querySelector('#groupSelector')
    $(menu).change(() => {
      let selectedGroup = $('#groupSelector').find('option:selected').get(0)
      this.updateCurrentGroupHandler(selectedGroup.dataset.groupId)
    })
  }

  updateCurrentGroupHandler (groupId) {
    this.currentGroup = _.find(this.user.groups, (group) => { return groupId === group.id })
    ChromeStorage.setData(selectedGroupNamespace, {data: JSON.stringify(this.currentGroup)}, ChromeStorage.local, () => {
      console.debug('Group updated. Name: %s id: %s', this.currentGroup.name, this.currentGroup.id)
      // Dispatch event
      LanguageUtils.dispatchCustomEvent(GroupSelector.eventGroupChange, {
        group: this.currentGroup,
        time: new Date()
      })
    })
  }

  destroy (callback) {
    // Destroy intervals
    if (this.loggedInInterval) {
      clearInterval(this.loggedInInterval)
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

GroupSelector.eventGroupChange = 'hypothesisGroupChanged'

module.exports = GroupSelector
