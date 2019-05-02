const _ = require('lodash')
const $ = require('jquery')
const Alerts = require('../utils/Alerts')
const Config = require('../Config')
const DefaultHighlighterGenerator = require('../specific/review/DefaultHighlighterGenerator')

const GroupName = Config.review.groupName

class GroupSelector {
  constructor () {
    this.groups = null
    this.currentGroup = null
    this.user = {}
  }

  init (callback) {
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
  }

  defineCurrentGroup (callback) {
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
          // TODO i18n
          Alerts.loadingAlert({title: 'First time reviewing?', text: 'It seems that it is your first time using Review&Go. We are configuring everything to start reviewing.', position: Alerts.position.center})
          // TODO Create default group
          DefaultHighlighterGenerator.createReviewHypothesisGroup((err, group) => {
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
  }

  checkIsLoggedIn (callback) {
    let sidebarURL = chrome.extension.getURL('pages/sidebar/groupSelection.html')
    $.get(sidebarURL, (html) => {
      // Append sidebar to content
      $('#abwaSidebarContainer').append($.parseHTML(html))
      if (!window.abwa.hypothesisClientManager.isLoggedIn()) {
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
    })
  }

  retrieveHypothesisGroups (callback) {
    window.abwa.hypothesisClientManager.hypothesisClient.getListOfGroups({}, (err, groups) => {
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

  destroy (callback) {
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

GroupSelector.eventGroupChange = 'hypothesisGroupChanged'

module.exports = GroupSelector
