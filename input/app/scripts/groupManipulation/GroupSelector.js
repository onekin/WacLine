import _ from 'lodash'
import $ from 'jquery'
import Alerts from '../utils/Alerts'
import ChromeStorage from '../utils/ChromeStorage'
import LanguageUtils from '../utils/LanguageUtils'
// PVSCL:IFCOND(Manual, LINE)
import Events from '../Events'
// PVSCL:ENDCOND
// PVSCL:IFCOND(MoodleResource,LINE)
import MoodleUtils from '../moodle/MoodleUtils'
// PVSCL:ENDCOND
// PVSCL:IFCOND(Hypothesis,LINE)
import HypothesisClientManager from '../annotationServer/hypothesis/HypothesisClientManager'
// PVSCL:ENDCOND
// PVSCL:IFCOND(BuiltIn or ApplicationBased or NOT(Codebook), LINE)
import Config from '../Config'
import Neo4JClientManager from '../annotationServer/neo4j/Neo4JClientManager'
const GroupName = Config.groupName
// PVSCL:ENDCOND

class GroupSelector {
  constructor () {
    this.selectedGroupNamespace = 'groupManipulation.currentGroup'
    this.groups = null
    this.currentGroup = null
    this.user = {}
    this.events = {}
    this.loggedInInterval = null
  }

  init (callback) {
    console.debug('Initializing group selector')
    // PVSCL:IFCOND(CodebookDelete, LINE)
    this.initCodebookDeletedEvent()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(RenameCodebook, LINE)
    this.initCodebookRenamedEvent()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ImportCodebook, LINE)
    this.initCodebookImportedEvent()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ExportCodebook, LINE)
    this.initCodebookExportedEvent()
    // PVSCL:ENDCOND
    this.checkIsLoggedIn((err) => {
      if (err) {
        // Stop propagating the rest of the functions, because it is not logged in annotation server
        // Show that user need to log in remote annotation server to continue
        Alerts.errorAlert({
          title: 'Log in required',
          text: chrome.i18n.getMessage('annotationServerLoginRequired')
        })
      } else {
        // Retrieve user profile (for further uses in other functionalities of the tool)
        this.retrieveUserProfile(() => {
          // Define current group
          this.defineCurrentGroup(() => {
            // PVSCL:IFCOND(Manual, LINE)
            this.reloadGroupsContainer()
            // PVSCL:ENDCOND
            console.debug('Initialized group selector')
            if (_.isFunction(callback)) {
              callback(null)
            }
          })
        })
      }
    })
  }
  // PVSCL:IFCOND(CodebookDelete, LINE)

  initCodebookDeletedEvent () {
    this.events.codebookDeletedEvent = { element: document, event: Events.codebookDeleted, handler: this.codebookDeletedEventHandler() }
    this.events.codebookDeletedEvent.element.addEventListener(this.events.codebookDeletedEvent.event, this.events.codebookDeletedEvent.handler, false)
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(RenameCodebook, LINE)

  initCodebookRenamedEvent () {
    this.events.codebookRenamedEvent = { element: document, event: Events.codebookRenamed, handler: this.codebookRenamedEventHandler() }
    this.events.codebookRenamedEvent.element.addEventListener(this.events.codebookRenamedEvent.event, this.events.codebookRenamedEvent.handler, false)
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(ImportCodebook, LINE)

  initCodebookImportedEvent () {
    this.events.codebookImportedEvent = { element: document, event: Events.codebookImported, handler: this.codebookImportedEventHandler() }
    this.events.codebookImportedEvent.element.addEventListener(this.events.codebookImportedEvent.event, this.events.codebookImportedEvent.handler, false)
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(ExportCodebook, LINE)

  initCodebookExportedEvent () {
    this.events.codebookExportedEvent = { element: document, event: Events.codebookExported, handler: this.codebookExportedEventHandler() }
    this.events.codebookExportedEvent.element.addEventListener(this.events.codebookExportedEvent.event, this.events.codebookExportedEvent.handler, false)
  }
  // PVSCL:ENDCOND

  /**
   * This function defines the group of annotations that is selected by default when the application is opened
   * @param callback
   */
  defineCurrentGroup (callback) {
    // PVSCL:IFCOND(ApplicationBased, LINE)
    // Defines the current group of the highlighter with an Application based group
    if (window.abwa.annotationBasedInitializer.initAnnotation) {
      this.defineGroupBasedOnInitAnnotation(callback)
    } else {
      this.retrieveUserProfile(() => {
        // Load all the groups belonged to current user
        this.retrieveGroups((err, groups) => {
          if (err) {
            callback(err)
          } else {
            const currentGroup = _.find(groups, (group) => { return group.name === GroupName })
            if (_.isObject(currentGroup)) {
              // Current group will be that group
              this.currentGroup = currentGroup
              if (_.isFunction(callback)) {
                callback(null)
              }
            } else {
              // PVSCL:IFCOND(BuiltIn, LINE)
              // TODO i18n
              Alerts.loadingAlert({ title: 'First time annotating?', text: 'It seems that it is your first time using the extension. We are configuring everything to start your annotation activity.', position: Alerts.position.center })
              // TODO Create default group
              this.createApplicationBasedGroupForUser((err, group) => {
                if (err) {
                  Alerts.errorAlert({ text: 'We are unable to create annotation group. Please check if you are logged in your annotation server.' })
                } else {
                  // PVSCL:IFCOND(Hypothesis,LINE)
                  // Modify group URL in Hypothes.is as it adds the name at the end of the URL
                  if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager)) {
                    group.links.html = group.links.html.substr(0, group.links.html.lastIndexOf('/'))
                  }
                  // PVSCL:ENDCOND
                  this.currentGroup = group
                  callback(null)
                }
              })
              // PVSCL:ELSECOND
              Alerts.errorAlert({ text: 'The group ' + GroupName + ' does not exist. Please configure the tool in the third-party provider.' })
              // PVSCL:ENDCOND
            }
          }
        })
      })
    }
    // PVSCL:ELSEIFCOND(Manual OR NOT(Codebook))
    // TODO Re-describe: Defines one of the possibles groups as the current group of the highlighter
    if (window.abwa.annotationBasedInitializer.initAnnotation) {
      this.defineGroupBasedOnInitAnnotation(callback)
    } else {
      this.retrieveUserProfile(() => {
        // Load all the groups belonged to current user
        this.retrieveGroups((err, groups) => {
          if (err) {
            callback(err)
          } else {
            ChromeStorage.getData(this.selectedGroupNamespace, ChromeStorage.local, (err, savedCurrentGroup) => {
              if (!err && !_.isEmpty(savedCurrentGroup) && _.has(savedCurrentGroup, 'data')) {
                // Parse saved current group
                try {
                  const savedCurrentGroupData = JSON.parse(savedCurrentGroup.data)
                  const currentGroup = _.find(this.groups, (group) => {
                    return group.id === savedCurrentGroupData.id
                  })
                  // Check if group exists in current user
                  if (_.isObject(currentGroup)) {
                    this.currentGroup = currentGroup
                  }
                } catch (e) {
                  // Nothing to do
                }
              }
              // If group cannot be retrieved from saved in extension annotationServer
              // PVSCL:IFCOND(BuiltIn or NOT(Codebook), LINE)
              // Try to load a group with defaultName
              if (_.isEmpty(this.currentGroup)) {
                this.currentGroup = _.find(window.abwa.groupSelector.groups, (group) => { return group.name === GroupName })
              }
              if (_.isEmpty(this.currentGroup)) {
                // TODO i18n
                Alerts.loadingAlert({
                  title: 'First time annotating?',
                  text: 'It seems that it is your first time using the extension. We are configuring everything to start annotation activity.',
                  position: Alerts.position.center
                })
                // TODO Create default group
                this.createApplicationBasedGroupForUser((err, group) => {
                  if (err) {
                    Alerts.errorAlert({ text: 'We are unable to create the group. Please check if you are logged in the annotation server.' })
                  } else {
                    // PVSCL:IFCOND(Hypothesis, LINE)
                    // Modify group URL in hypothesis
                    if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager)) {
                      if (_.has(group, 'links.html')) {
                        group.links.html = group.links.html.substr(0, group.links.html.lastIndexOf('/'))
                      }
                    }
                    // PVSCL:ENDCOND
                    this.currentGroup = group
                    callback(null)
                  }
                })
              } else { // If group was found in extension annotation server
                if (_.isFunction(callback)) {
                  callback()
                }
              }
              // PVSCL:ELSECOND
              // PVSCL:IFCOND(BrowserStorage, LINE)
              const BrowserStorageManager = require('../annotationServer/browserStorage/BrowserStorageManager').default
              if (_.isEmpty(this.currentGroup) && !_.isEmpty(window.abwa.groupSelector.groups) && LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, BrowserStorageManager)) {
                this.currentGroup = _.first(window.abwa.groupSelector.groups)
              }
              // PVSCL:ENDCOND
              // TODO Add an option to get the current group by the extension identification, only retrieves groups created by the product
              if (_.isEmpty(this.currentGroup) && !_.isEmpty(window.abwa.groupSelector.groups)) {
                this.currentGroup = _.first(window.abwa.groupSelector.groups)
              }
              if (_.isEmpty(window.abwa.groupSelector.groups)) {
                Alerts.errorAlert({ text: 'No groups found. Please configure the tool in the third-party provider.' })
              }
              if (_.isFunction(callback)) {
                callback()
              }
              // PVSCL:ENDCOND
            })
          }
        })
      })
    }
    // PVSCL:ELSEIFCOND(MoodleResource)
    // Defines the current group of the highlighter with an a Moodle based group
    const fileMetadata = window.abwa.targetManager.fileMetadata
    // Get group name from file metadata
    const hashedGroupName = MoodleUtils.getHashedGroup({ studentId: fileMetadata.studentId, courseId: fileMetadata.courseId, moodleEndpoint: fileMetadata.url.split('pluginfile.php')[0] })
    // Load all the groups belonged to current user
    this.retrieveGroups((err, groups) => {
      if (err) {
        callback(err)
      } else {
        const group = _.find(groups, (group) => { return group.name === hashedGroupName })
        if (_.isObject(group)) {
          // Current group will be that group
          this.currentGroup = group
          ChromeStorage.setData(this.selectedGroupNamespace, { data: JSON.stringify(this.currentGroup) }, ChromeStorage.local)
          if (_.isFunction(callback)) {
            callback(null)
          }
        } else {
          // Warn user not group is defined, configure tool first
          Alerts.errorAlert({ text: 'If you are a teacher you need to configure Mark&Go first.<br/>If you are a student, you need to join feedback group first.', title: 'Unable to start Mark&Go' }) // TODO i18n
        }
      }
    })
    // PVSCL:ENDCOND
  }

  defineGroupBasedOnInitAnnotation (callback) {
    const annotationGroupId = window.abwa.annotationBasedInitializer.initAnnotation.group
    // Load group of annotation
    this.retrieveUserProfile(() => {
      this.retrieveGroups((err, groups) => {
        if (err) {
          if (_.isFunction(callback)) {
            callback(err)
          }
        } else {
          // Set current group
          this.currentGroup = _.find(groups, (group) => { return group.id === annotationGroupId })
          // Save to chrome annotation server current group
          ChromeStorage.setData(this.selectedGroupNamespace, { data: JSON.stringify(this.currentGroup) }, ChromeStorage.local)
          if (_.isFunction(callback)) {
            callback()
          }
        }
      })
    })
  }

  checkIsLoggedIn (callback) {
    const sidebarURL = chrome.extension.getURL('pages/sidebar/groupSelection.html')
    $.get(sidebarURL, (html) => {
      // Append sidebar to content
      $('#abwaSidebarContainer').append($.parseHTML(html))
      window.abwa.annotationServerManager.isLoggedIn((err, result) => {
        if (err || !result) {
          // Display login/sign up form
          $('#notLoggedInGroupContainer').attr('aria-hidden', 'false')
          // Hide group container
          $('#loggedInGroupContainer').attr('aria-hidden', 'true')
          // Hide purposes wrapper
          $('#purposesWrapper').attr('aria-hidden', 'true')
          // Open the sidebar to notify user that needs to log in
          window.abwa.sidebar.openSidebar()
          // PVSCL:IFCOND(Hypothesis,LINE)
          document.getElementById('hypothesisLoginButton').addEventListener('click', () => {
            chrome.runtime.sendMessage({ scope: 'hypothesis', cmd: 'userLoginForm' }, () => {
              if (result.error) {
                if (_.isFunction(callback)) {
                  callback(new Error(result.error))
                }
              } else {
                console.debug('Logged in. Reloading...')
                window.location.reload()
              }
            })
          })
          if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager)) {
            // Show login form for Hypothes.is in sidebar
            $('#hypothesisLoginContainer').attr('aria-hidden', 'false')
            // Start listening to when is logged in continuously
            /* this.loggedInInterval = setInterval(() => {
              window.abwa.annotationServerManager.reloadClient(() => {
                window.abwa.annotationServerManager.isLoggedIn((err, result) => {
                  if (_.isEmpty(err) || result) {
                    console.debug('Logged in. Reloading...')
                    window.location.reload()
                  } else {
                    console.debug('Still not logged in.')
                  }
                })
              })
            }, 2000) */
          }
          // PVSCL:ENDCOND
          // PVSCL:IFCOND(Neo4J, LINE)
          if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, Neo4JClientManager)) {
            $('#neo4jLoginContainer').attr('aria-hidden', 'false')
          }
          // Add to configuration link the URL to options page that is dynamic depending on the extension ID
          document.getElementById('configurationPageUrlForNeo4jLogin').href = chrome.extension.getURL('pages/options.html')
          // PVSCL:ENDCOND
          if (_.isFunction(callback)) {
            callback(new Error('Is not logged in'))
          }
        } else {
          if (_.isFunction(callback)) {
            callback()
          }
        }
      })
    })
  }
  // PVSCL:IFCOND(BuiltIn OR NOT(Codebook),LINE)

  createApplicationBasedGroupForUser (callback) {
    window.abwa.annotationServerManager.client.createNewGroup({ name: Config.groupName }, callback)
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Manual, LINE)

  reloadGroupsContainer (callback) {
    this.retrieveGroups(() => {
      this.container = document.querySelector('#groupSelector')
      this.container.setAttribute('aria-expanded', 'false')
      this.renderGroupsContainer()
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  renderGroupsContainer () {
    // Current group element rendering
    const currentGroupNameElement = document.querySelector('#groupSelectorName')
    if (this.currentGroup) {
      currentGroupNameElement.innerText = this.currentGroup.name
      currentGroupNameElement.title = this.currentGroup.name
    }
    // Toggle functionality
    const toggleElement = document.querySelector('#groupSelectorToggle')
    if (this.groupSelectorToggleClickEvent) {
      currentGroupNameElement.removeEventListener('click', this.groupSelectorToggleClickEvent)
      toggleElement.removeEventListener('click', this.groupSelectorToggleClickEvent)
    }
    this.groupSelectorToggleClickEvent = this.createGroupSelectorToggleEvent()
    currentGroupNameElement.addEventListener('click', this.groupSelectorToggleClickEvent)
    toggleElement.addEventListener('click', this.groupSelectorToggleClickEvent)
    // Groups container
    const groupsContainer = document.querySelector('#groupSelectorContainerSelector')
    groupsContainer.innerText = ''
    // For each group
    const groupSelectorItemTemplate = document.querySelector('#groupSelectorItem')
    for (let i = 0; i < this.groups.length; i++) {
      const group = this.groups[i]
      const groupSelectorItem = $(groupSelectorItemTemplate.content.firstElementChild).clone().get(0)
      // Container
      groupsContainer.appendChild(groupSelectorItem)
      groupSelectorItem.id = 'groupSelectorItemContainer_' + group.id
      // Name
      const nameElement = groupSelectorItem.querySelector('.groupSelectorItemName')
      nameElement.innerText = group.name
      nameElement.title = 'Move to annotation group ' + group.name
      nameElement.addEventListener('click', this.createGroupChangeEventHandler(group.id))
      // PVSCL:IFCOND(RenameCodebook or ExportCodebook or CodebookDelete,LINE)
      // Toggle
      groupSelectorItem.querySelector('.groupSelectorItemToggle').addEventListener('click', this.createGroupSelectorItemToggleEventHandler(group.id))
      // Options
      // PVSCL:IFCOND(RenameCodebook,LINE)
      groupSelectorItem.querySelector('.renameGroup').addEventListener('click', this.createGroupSelectorRenameOptionEventHandler(group))
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(ExportCodebook,LINE)
      groupSelectorItem.querySelector('.exportGroup').addEventListener('click', this.createGroupSelectorExportOptionEventHandler(group))
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(CodebookDelete,LINE)
      groupSelectorItem.querySelector('.deleteGroup').addEventListener('click', this.createGroupSelectorDeleteOptionEventHandler(group))
      // PVSCL:ENDCOND
      // PVSCL:ENDCOND
    }
    // PVSCL:IFCOND(BuiltIn,LINE)
    // New group button
    const newGroupButton = document.createElement('div')
    newGroupButton.innerText = 'Create codebook'
    newGroupButton.id = 'createNewModelButton'
    newGroupButton.className = 'groupSelectorButton'
    newGroupButton.title = 'Create a new codebook'
    newGroupButton.addEventListener('click', this.createNewReviewModelEventHandler())
    groupsContainer.appendChild(newGroupButton)
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ImportCodebook,LINE)
    // Import button
    const importGroupButton = document.createElement('div')
    importGroupButton.className = 'groupSelectorButton'
    importGroupButton.innerText = 'Import codebook'
    importGroupButton.id = 'importReviewModelButton'
    importGroupButton.addEventListener('click', this.createImportGroupButtonEventHandler())
    groupsContainer.appendChild(importGroupButton)
    // PVSCL:ENDCOND
  }

  createGroupSelectorToggleEvent () {
    return (e) => {
      this.toggleGroupSelectorContainer()
    }
  }

  toggleGroupSelectorContainer () {
    const groupSelector = document.querySelector('#groupSelector')
    if (groupSelector.getAttribute('aria-expanded') === 'true') {
      groupSelector.setAttribute('aria-expanded', 'false')
    } else {
      groupSelector.setAttribute('aria-expanded', 'true')
    }
  }

  createGroupChangeEventHandler (groupId) {
    return (e) => {
      this.setCurrentGroup(groupId)
    }
  }

  updateCurrentGroupHandler (groupId) {
    this.currentGroup = _.find(this.groups, (group) => { return groupId === group.id })
    ChromeStorage.setData(this.selectedGroupNamespace, { data: JSON.stringify(this.currentGroup) }, ChromeStorage.local, () => {
      console.debug('Group updated. Name: %s id: %s', this.currentGroup.name, this.currentGroup.id)
      // Dispatch event
      LanguageUtils.dispatchCustomEvent(Events.groupChanged, {
        group: this.currentGroup,
        time: new Date()
      })
    })
  }

  setCurrentGroup (groupId, callback) {
    // Set current group
    const newCurrentGroup = _.find(this.groups, (group) => { return group.id === groupId })
    if (newCurrentGroup) {
      this.currentGroup = newCurrentGroup
    }
    // Render groups container
    this.reloadGroupsContainer((err) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // Event group changed
        this.updateCurrentGroupHandler(this.currentGroup.id)
        // Open sidebar
        window.abwa.sidebar.openSidebar()
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }
  // PVSCL:IFCOND(RenameCodebook or ExportCodebook or CodebookDelete,LINE)

  createGroupSelectorItemToggleEventHandler (groupId) {
    return (e) => {
      const groupSelectorItemContainer = document.querySelector('#groupSelectorContainerSelector').querySelector('#groupSelectorItemContainer_' + groupId)
      if (groupSelectorItemContainer.getAttribute('aria-expanded') === 'true') {
        groupSelectorItemContainer.setAttribute('aria-expanded', 'false')
      } else {
        groupSelectorItemContainer.setAttribute('aria-expanded', 'true')
      }
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(BuiltIn,LINE)

  createNewReviewModelEventHandler () {
    return () => {
      this.createNewGroup((err, result) => {
        if (err) {
          Alerts.errorAlert({ text: 'Unable to create a new group. Please try again or contact developers if the error continues happening.' })
        } else {
          // Update list of groups from annotation Server
          this.retrieveGroups(() => {
            // Move group to new created one
            this.setCurrentGroup(result.id, () => {
              // Expand groups container
              this.container.setAttribute('aria-expanded', 'false')
              // Reopen sidebar if closed
              window.abwa.sidebar.openSidebar()
            })
          })
        }
      })
    }
  }

  createNewGroup (callback) {
    Alerts.inputTextAlert({
      title: 'Create a new codebook',
      inputPlaceholder: 'Type here the name of your new codebook...',
      preConfirm: (groupName) => {
        if (_.isString(groupName)) {
          if (groupName.length <= 0) {
            const swal = require('sweetalert2').default
            swal.showValidationMessage('Name cannot be empty.')
          } else if (groupName.length > 25) {
            const swal = require('sweetalert2').default
            swal.showValidationMessage('The codebook name cannot be higher than 25 characters.')
          } else {
            return groupName
          }
        }
      },
      callback: (err, groupName) => {
        if (err) {
          window.alert('Unable to load swal. Please contact developer.')
        } else {
          groupName = LanguageUtils.normalizeString(groupName)
          window.abwa.annotationServerManager.client.createNewGroup({
            name: groupName,
            description: 'A group created using annotation tool ' + chrome.runtime.getManifest().name
          }, callback)
        }
      }
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(CodebookDelete,LINE)

  createGroupSelectorDeleteOptionEventHandler (group) {
    return (event) => {
      LanguageUtils.dispatchCustomEvent(Events.deleteCodebook, { codebook: group, user: this.user })
    }
  }

  codebookDeletedEventHandler () {
    return (event) => {
      if (event.detail.err) {
        Alerts.errorAlert({ text: 'Error when deleting the group: ' + event.detail.err.message })
      } else {
        // If removed group is the current group, current group must defined again
        if (event.detail.group.id === this.currentGroup.id) {
          this.currentGroup = null
        }
        // Move to first other group if exists
        this.defineCurrentGroup(() => {
          this.reloadGroupsContainer(() => {
            // Dispatch group has changed
            this.updateCurrentGroupHandler(this.currentGroup.id)
            // Expand groups container
            this.container.setAttribute('aria-expanded', 'false')
            // Reopen sidebar if closed
            window.abwa.sidebar.openSidebar()
          })
        })
      }
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(RenameCodebook,LINE)

  createGroupSelectorRenameOptionEventHandler (group) {
    return () => {
      LanguageUtils.dispatchCustomEvent(Events.renameCodebook, { codebook: group })
    }
  }

  codebookRenamedEventHandler () {
    return (event) => {
      if (event.detail.err) {
        Alerts.errorAlert({ text: 'Error when renaming the group: ' + event.detail.err.message })
      } else {
        this.currentGroup = event.detail.group
        this.retrieveGroups(() => {
          this.reloadGroupsContainer(() => {
            this.container.setAttribute('aria-expanded', 'true')
            window.abwa.sidebar.openSidebar()
          })
        })
      }
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(ImportCodebook,LINE)

  createImportGroupButtonEventHandler () {
    return () => {
      LanguageUtils.dispatchCustomEvent(Events.importCodebook, { importTo: 'JSON' })
    }
  }

  codebookImportedEventHandler () {
    return (event) => {
      if (event.detail.err) {
        Alerts.errorAlert({ text: 'Error when deleting the group: ' + event.detail.err.message })
      } else {
        // Update groups from annotation server
        this.retrieveGroups(() => {
          this.setCurrentGroup(event.detail.groupId)
        })
      }
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(ExportCodebook,LINE)

  createGroupSelectorExportOptionEventHandler (group) {
    return () => {
      window.abwa.codebookManager.codebookReader.getCodebookDefinition(group, (err, groupAnnotations) => {
        if (err) {
          Alerts.errorAlert({ text: 'Unable to export group.' })
        } else {
          // Export codebook
          LanguageUtils.dispatchCustomEvent(Events.exportCodebook, { exportTo: 'JSON', codebookAnnotations: groupAnnotations, codebook: group })
        }
      })
    }
  }

  codebookExportedEventHandler () {
    return (event) => {
      if (event.detail.err) {
        Alerts.errorAlert({ text: 'Error when trying to export codebook. Error: ' + event.detail.err })
      }
    }
  }
  // PVSCL:ENDCOND

  retrieveGroups (callback) {
    window.abwa.annotationServerManager.client.getListOfGroups({}, (err, groups) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        this.groups = groups
        // PVSCL:IFCOND(Hypothesis,LINE)
        // Remove public group in hypothes.is and modify group URL
        if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager)) {
          _.remove(this.groups, (group) => {
            return group.id === '__world__'
          })
          _.forEach(this.groups, (group) => {
            if (_.has(group, 'links.html')) {
              group.links.html = group.links.html.substr(0, group.links.html.lastIndexOf('/'))
            }
          })
        }
        // PVSCL:ENDCOND
        if (_.isFunction(callback)) {
          callback(null, groups)
        }
      }
    })
  }

  retrieveUserProfile (callback) {
    window.abwa.annotationServerManager.client.getUserProfile((err, profile) => {
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
      // TODO Re-enable orcid mechanism to identify
      return window.abwa.annotationServerManager.annotationServerMetadata.userUrl + this.user.userid.replace('acct:', '').replace('@hypothes.is', '')
    } else {
      return null
    }
  }

  destroy (callback) {
    // PVSCL:IFCOND(Manual, LINE)
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

export default GroupSelector
