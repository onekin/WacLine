const _ = require('lodash')
const $ = require('jquery')
const Alerts = require('../utils/Alerts')
// PVSCL:IFCOND(User or ApplicationBased, LINE)
const Config = require('../Config')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Manual, LINE)
const ChromeStorage = require('../utils/ChromeStorage')
const LanguageUtils = require('../utils/LanguageUtils')
// PVSCL:ENDCOND
// PVSCL:IFCOND(User or ApplicationBased, LINE)

const GroupName = Config.groupName
//PVSCL:ENDCOND
//PVSCL:IFCOND(Manual, LINE)
const selectedGroupNamespace = 'hypothesis.currentGroup'
//PVSCL:IFCOND(Hypothesis,LINE)
const checkHypothesisLoggedInWhenPromptInSeconds = 2 // When not logged in, check if user has logged in
//PVSCL:ENDCOND
//PVSCL:IFCOND(NOT(User), LINE)
const defaultGroup = {id: '__world__', name: 'Public', public: true}
//PVSCL:ENDCOND
//PVSCL:ENDCOND

class GroupSelector {
  constructor () {
    this.groups = null
    this.currentGroup = null
    this.user = {}
  }

  init (callback) {
    // PVSCL:IFCOND(Manual, LINE)
    console.debug('Initializing group selector')
    this.addGroupSelectorToSidebar(() => {
      this.reloadGroupsContainer(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      })
    })
    // PVSCL:ELSECOND
    console.debug('Initializing group selector')
    this.checkIsLoggedIn((err) => {
      if (err) {
        // Stop propagating the rest of the functions, because it is not logged in hypothesis
        // Show that user need to log in hypothes.is to continue
        Alerts.errorAlert({
          title: 'Log in Hypothes.is required',
          text: chrome.i18n.getMessage('HypothesisLoginRequired')
        })
      } else {
        // Retrieve user profile (for further uses in other functionalities of the tool)
        this.retrieveUserProfile(() => {
          // Define current group
          this.defineCurrentGroup(() => {
            console.debug('Initialized group selector')
            if (_.isFunction(callback)) {
              callback(null)
            }
          })
        })
      }
    })
    // PVSCL:ENDCOND
  }

  defineCurrentGroup (callback) {
    // PVSCL:IFCOND(ApplicationBased, LINE)
    // Load all the groups belonged to current user
    this.retrieveHypothesisGroups((err, groups) => {
      if (err) {

      } else {
        let group = _.find(groups, (group) => { return group.name === GroupName })
        if (_.isObject(group)) {
          // Current group will be that group
          this.currentGroup = group
          if (_.isFunction(callback)) {
            callback(null)
          }
        } else {
          // PVSCL:IFCOND(User, LINE) 
          // TODO i18n
          Alerts.loadingAlert({title: 'First time reviewing?', text: 'It seems that it is your first time using Review&Go. We are configuring everything to start reviewing.', position: Alerts.position.center})
          // TODO Create default group
          this.createApplicationBasedGroupForUser((err, group) => {
            if (err) {
              Alerts.errorAlert({text: 'We are unable to create Hypothes.is group for Review&Go. Please check if you are logged in Hypothes.is.'})
            } else {
              this.currentGroup = group
              callback(null)
            }
          })
          // PVSCL:ELSECOND
          Alerts.errorAlert({text: 'The group ' + GroupName + ' does not exist. Please configure the tool in the third-party provider.'})
          // PVSCL:ENDCOND
        }
      }
    })
    //PVSCL:ENDCOND
    //PVSCL:IFCOND(Manual, LINE)
    // If initialization annotation is set
    if (window.abwa.annotationBasedInitializer.initAnnotation) {
      let annotationGroupId = window.abwa.annotationBasedInitializer.initAnnotation.group
      // Load group of annotation
      this.retrieveUserProfile(() => {
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
      })
    } else {
      this.retrieveUserProfile(() => {
      //PVSCL:IFCOND(User, LINE)
        // Load all the groups belonged to current user
        this.retrieveHypothesisGroups((err, groups) => {
          if (err) {

          } else {
            let group = _.find(groups, (group) => {
              return group.name === GroupName
            })
            if (_.isObject(group)) {
              // Current group will be that group
              this.currentGroup = group
              if (_.isFunction(callback)) {
                callback(null)
              }
            } else {
              // TODO i18n
              Alerts.loadingAlert({
                title: 'First time reviewing?',
                text: 'It seems that it is your first time using Review&Go. We are configuring everything to start reviewing.',
                position: Alerts.position.center
              })
              // TODO Create default group
              this.createApplicationBasedGroupForUser((err, group) => {
                if (err) {
                  Alerts.errorAlert({text: 'We are unable to create Hypothes.is group for Review&Go. Please check if you are logged in Hypothes.is.'})
                } else {
                  this.currentGroup = group
                  callback(null)
                }
              })
            }
          }
        })
        //PVSCL:ELSECOND
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
      //PVSCL:ENDCOND
      })
    }
    //PVSCL:ENDCOND
  }
//PVSCL:IFCOND(User,LINE)

  createApplicationBasedGroupForUser (callback) {
    window.abwa.storageManager.client.createNewGroup({name: Config.groupName}, callback)
  }
//PVSCL:ENDCOND
//PVSCL:IFCOND(NOT(Manual),LINE)

  checkIsLoggedIn (callback) {
    let sidebarURL = chrome.extension.getURL('pages/sidebar/groupSelection.html')
    $.get(sidebarURL, (html) => {
      // Append sidebar to content
      $('#abwaSidebarContainer').append($.parseHTML(html))
      //PVSCL:IFCOND(Hypothesis,LINE)
      if (!window.abwa.storageManager.isLoggedIn()) {
        // Display login/sign up form
        $('#notLoggedInGroupContainer').attr('aria-hidden', 'false')
        // Hide group container
        $('#loggedInGroupContainer').attr('aria-hidden', 'true')
        // Hide purposes wrapper
        $('#purposesWrapper').attr('aria-hidden', 'true')
        // Start listening to when is logged in continuously
        chrome.runtime.sendMessage({scope: 'hypothesis', cmd: 'startListeningLogin'})
        // Open the sidebar to notify user that needs to log in
        window.abwa.sidebar.openSidebar()
        if (_.isFunction(callback)) {
          callback(new Error('Is not logged in'))
        }
      } else {
        if (_.isFunction(callback)) {
          callback()
        }
      }
      //PVSCL:ENDCOND
      //PVSCL:IFCOND(Local,LINE)
      if (_.isFunction(callback)) {
        callback()
      }
      //PVSCL:ENDCOND
    })
  }
//PVSCL:ENDCOND
// PVSCL:IFCOND(Manual, LINE)

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

  reloadGroupsContainer (callback) {
    //PVSCL:IFCOND(Hypothesis,LINE)
    if (window.abwa.storageManager.isLoggedIn()) {
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
    //PVSCL:ENDCOND
    //PVSCL:IFCOND(Local,LINE)
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
    //PVSCL:ENDCOND
  }
  //PVSCL:IFCOND(Hypothesis,LINE)

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
  //PVSCL:ENDCOND

  renderGroupsContainer (callback) {
    // Display group selector and purposes selector
    $('#purposesWrapper').attr('aria-hidden', 'false')
    // Retrieve groups
    this.retrieveHypothesisGroups((groups) => {
      console.debug(groups)
      let dropdownMenu = document.querySelector('#groupSelector')
      dropdownMenu.innerHTML = '' // Remove all groups
      this.groups.forEach(group => {
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

  setEventForGroupSelectChange () {
    let menu = document.querySelector('#groupSelector')
    $(menu).change(() => {
      let selectedGroup = $('#groupSelector').find('option:selected').get(0)
      this.updateCurrentGroupHandler(selectedGroup.dataset.groupId)
    })
  }

  updateCurrentGroupHandler (groupId) {
    this.currentGroup = _.find(this.groups, (group) => { return groupId === group.id })
    ChromeStorage.setData(selectedGroupNamespace, {data: JSON.stringify(this.currentGroup)}, ChromeStorage.local, () => {
      console.debug('Group updated. Name: %s id: %s', this.currentGroup.name, this.currentGroup.id)
      // Dispatch event
      LanguageUtils.dispatchCustomEvent(GroupSelector.eventGroupChange, {
        group: this.currentGroup,
        time: new Date()
      })
    })
  }
// PVSCL:ENDCOND

  retrieveHypothesisGroups (callback) {
    window.abwa.storageManager.client.getListOfGroups({}, (err, groups) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        this.groups = groups
        if (_.isFunction(callback)) {
          callback(null, groups)
        }
      }
    })
  }

  retrieveUserProfile (callback) {
    window.abwa.storageManager.client.getUserProfile((err, profile) => {
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

  getCreatorData () {
    if (this.user) {
      if (this.user.metadata) {
        if (this.user.metadata.orcid) {
          return 'https://orcid.org/' + this.user.metadata.orcid
        } else if (this.user.metadata.link) {
          return this.user.metadata.link
        } else {
          return 'https://hypothes.is/users/' + this.user.userid.replace('acct:', '').replace('@hypothes.is', '')
        }
      } else {
        return 'https://hypothes.is/users/' + this.user.userid.replace('acct:', '').replace('@hypothes.is', '')
      }
    } else {
      return null
    }
  }

  destroy (callback) {
    //PVSCL:IFCOND( Manual, LINE)
    // Destroy intervals
    if (this.loggedInInterval) {
      clearInterval(this.loggedInInterval)
    }
    // PVSCL:ENDCOND
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

GroupSelector.eventGroupChange = 'hypothesisGroupChanged'

module.exports = GroupSelector
