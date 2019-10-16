const _ = require('lodash')
const $ = require('jquery')
const Alerts = require('../utils/Alerts')
const ChromeStorage = require('../utils/ChromeStorage')
const LanguageUtils = require('../utils/LanguageUtils')
// PVSCL:IFCOND(User or ApplicationBased, LINE)
const Config = require('../Config')
const GroupName = Config.groupName
// PVSCL:ENDCOND
//PVSCL:IFCOND(Manual, LINE)
const Events = require('../contentScript/Events')
//PVSCL:ENDCOND
//PVSCL:IFCOND(MoodleResourceBased,LINE)
const CryptoUtils = require('../utils/CryptoUtils')
//PVSCL:ENDCOND
//PVSCL:IFCOND(Hypothesis,LINE)
const HypothesisClientManager = require('../storage/hypothesis/HypothesisClientManager')
//PVSCL:ENDCOND
//PVSCL:IFCOND(ImportGroup, LINE)
const AnnotationGuide = require('../definition/AnnotationGuide')
const ImportSchema = require('./ImportSchema')
//PVSCL:ENDCOND
// PVSCL:IFCOND(ExportGroup, LINE)
const ExportSchema = require('./ExportSchema')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Local, LINE)
const LocalStorageManager = require('../storage/local/LocalStorageManager')
// PVSCL:ENDCOND

class GroupSelector {
  constructor () {
    this.selectedGroupNamespace = 'groupManipulation.currentGroup'
    this.groups = null
    this.currentGroup = null
    this.user = {}
  }

  init (callback) {
    console.debug('Initializing group selector')
    this.checkIsLoggedIn((err) => {
      if (err) {
        // Stop propagating the rest of the functions, because it is not logged in storage
        // Show that user need to log in remote storage to continue
        Alerts.errorAlert({
          title: 'Log in selected storage required',
          text: chrome.i18n.getMessage('StorageLoginRequired')
        })
      } else {
        // Retrieve user profile (for further uses in other functionalities of the tool)
        this.retrieveUserProfile(() => {
          // Define current group
          this.defineCurrentGroup(() => {
            //PVSCL:IFCOND(Manual, LINE)
            this.reloadGroupsContainer()
            //PVSCL:ENDCOND
            console.debug('Initialized group selector')
            if (_.isFunction(callback)) {
              callback(null)
            }
          })
        })
      }
    })
  }
  //PVSCL:IFCOND(ApplicationBased, LINE)

  // Defines the current group of the highlighter with an Application based group
  defineCurrentGroup (callback) {
    if (window.abwa.annotationBasedInitializer.initAnnotation) {
      let annotationGroupId = window.abwa.annotationBasedInitializer.initAnnotation.group
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
            // Save to chrome storage current group
            ChromeStorage.setData(this.selectedGroupNamespace, {data: JSON.stringify(this.currentGroup)}, ChromeStorage.local)
            if (_.isFunction(callback)) {
              callback()
            }
          }
        })
      })
    } else {
      this.retrieveUserProfile(() => {
        // Load all the groups belonged to current user
        this.retrieveGroups((err, groups) => {
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
              Alerts.loadingAlert({title: 'First time reviewing?', text: 'It seems that it is your first time using the extension. We are configuring everything to start reviewing.', position: Alerts.position.center})
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
      })
    }
  }
//PVSCL:ENDCOND
//PVSCL:IFCOND(Manual, LINE)

  // Defines the one of the possibles groups as the current group of the highlighter
  defineCurrentGroup (callback) {
    if (window.abwa.annotationBasedInitializer.initAnnotation) {
      let annotationGroupId = window.abwa.annotationBasedInitializer.initAnnotation.group
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
            // Save to chrome storage current group
            ChromeStorage.setData(this.selectedGroupNamespace, {data: JSON.stringify(this.currentGroup)}, ChromeStorage.local)
            if (_.isFunction(callback)) {
              callback()
            }
          }
        })
      })
    } else {
      this.retrieveUserProfile(() => {
        // Load all the groups belonged to current user
        this.retrieveGroups((err, groups) => {
          if (err) {

          } else {
            ChromeStorage.getData(this.selectedGroupNamespace, ChromeStorage.local, (err, savedCurrentGroup) => {
              if (!err && !_.isEmpty(savedCurrentGroup) && _.has(savedCurrentGroup, 'data')) {
                // Parse saved current group
                try {
                  let savedCurrentGroupData = JSON.parse(savedCurrentGroup.data)
                  let currentGroup = _.find(this.groups, (group) => {
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
              // If group cannot be retrieved from saved in extension storage
              //PVSCL:IFCOND(User, LINE)
              // Try to load a group with defaultName
              if (_.isEmpty(this.currentGroup)) {
                this.currentGroup = _.find(window.abwa.groupSelector.groups, (group) => { return group.name === GroupName })
              }
              if (_.isEmpty(this.currentGroup)) {
                // TODO i18n
                Alerts.loadingAlert({
                  title: 'First time reviewing?',
                  text: 'It seems that it is your first time using the extension. We are configuring everything to start reviewing.',
                  position: Alerts.position.center
                })
                // TODO Create default group
                this.createApplicationBasedGroupForUser((err, group) => {
                  if (err) {
                    Alerts.errorAlert({text: 'We are unable to create the group. Please check if you are logged in the storage.'})
                  } else {
                    //PVSCL:IFCOND(Hypothesis, LINE)
                    // Modify group URL in hypothesis
                    if (LanguageUtils.isInstanceOf(window.abwa.storageManager, HypothesisClientManager)) {
                      if (_.has(group, 'links.html')) {
                        group.links.html = group.links.html.substr(0, group.links.html.lastIndexOf('/'))
                      }
                    }
                    //PVSCL:ENDCOND
                    this.currentGroup = group
                    callback(null)
                  }
                })
              } else { // If group was found in extension storage
                if (_.isFunction(callback)) {
                  callback()
                }
              }
              //PVSCL:ELSECOND
              // PVSCL:IFCOND(Local, LINE)
              if (_.isEmpty(this.currentGroup) && !_.isEmpty(window.abwa.groupSelector.groups) && LanguageUtils.isInstanceOf(window.abwa.storageManager, LocalStorageManager)) {
                this.currentGroup = _.first(window.abwa.groupSelector.groups)
              }
              //PVSCL:ENDCOND
              // TODO Add an option to get the current group by the extension identification, only retrieves groups created by the product
              if (_.isEmpty(this.currentGroup) && !_.isEmpty(window.abwa.groupSelector.groups)) {
                this.currentGroup = _.first(window.abwa.groupSelector.groups)
              }
              if (_.isEmpty(window.abwa.groupSelector.groups)) {
                Alerts.errorAlert({text: 'No groups found. Please configure the tool in the third-party provider.'})
              }
              if (_.isFunction(callback)) {
                callback()
              }
              //PVSCL:ENDCOND
            })
          }
        })
      })
    }
  }
//PVSCL:ENDCOND
//PVSCL:IFCOND(MoodleResourceBased, LINE)

  // Defines the current group of the highlighter with an a Moodle based group
  defineCurrentGroup (callback) {
    let fileMetadata = window.abwa.contentTypeManager.fileMetadata
    // Get group name from file metadata
    let groupName = (new URL(fileMetadata.url)).host + fileMetadata.courseId + fileMetadata.studentId
    let hashedGroupName = 'MG' + CryptoUtils.hash(groupName).substring(0, 23)
    // Load all the groups belonged to current user
    this.retrieveGroups((err, groups) => {
      if (err) {

      } else {
        let group = _.find(groups, (group) => { return group.name === hashedGroupName })
        if (_.isObject(group)) {
          // Current group will be that group
          this.currentGroup = group
          ChromeStorage.setData(this.selectedGroupNamespace, {data: JSON.stringify(this.currentGroup)}, ChromeStorage.local)
          if (_.isFunction(callback)) {
            callback(null)
          }
        } else {
          // Warn user not group is defined, configure tool first
          Alerts.errorAlert({text: 'If you are a teacher you need to configure Mark&Go first.<br/>If you are a student, you need to join feedback group first.', title: 'Unable to start Mark&Go'}) // TODO i18n
        }
      }
    })
  }
//PVSCL:ENDCOND

  checkIsLoggedIn (callback) {
    let sidebarURL = chrome.extension.getURL('pages/sidebar/groupSelection.html')
    $.get(sidebarURL, (html) => {
      // Append sidebar to content
      $('#abwaSidebarContainer').append($.parseHTML(html))
      if (!window.abwa.storageManager.isLoggedIn()) {
        //PVSCL:IFCOND(Hypothesis,LINE)
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
        //PVSCL:ENDCOND
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
//PVSCL:IFCOND(User,LINE)

  createApplicationBasedGroupForUser (callback) {
    window.abwa.storageManager.client.createNewGroup({name: Config.groupName}, callback)
  }
//PVSCL:ENDCOND
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
    let currentGroupNameElement = document.querySelector('#groupSelectorName')
    currentGroupNameElement.innerText = this.currentGroup.name
    currentGroupNameElement.title = this.currentGroup.name
    // Toggle functionality
    let toggleElement = document.querySelector('#groupSelectorToggle')
    if (this.groupSelectorToggleClickEvent) {
      currentGroupNameElement.removeEventListener('click', this.groupSelectorToggleClickEvent)
      toggleElement.removeEventListener('click', this.groupSelectorToggleClickEvent)
    }
    this.groupSelectorToggleClickEvent = this.createGroupSelectorToggleEvent()
    currentGroupNameElement.addEventListener('click', this.groupSelectorToggleClickEvent)
    toggleElement.addEventListener('click', this.groupSelectorToggleClickEvent)
    // Groups container
    let groupsContainer = document.querySelector('#groupSelectorContainerSelector')
    groupsContainer.innerText = ''
    // For each group
    let groupSelectorItemTemplate = document.querySelector('#groupSelectorItem')
    for (let i = 0; i < this.groups.length; i++) {
      let group = this.groups[i]
      let groupSelectorItem = $(groupSelectorItemTemplate.content.firstElementChild).clone().get(0)
      // Container
      groupsContainer.appendChild(groupSelectorItem)
      groupSelectorItem.id = 'groupSelectorItemContainer_' + group.id
      // Name
      let nameElement = groupSelectorItem.querySelector('.groupSelectorItemName')
      nameElement.innerText = group.name
      nameElement.title = 'Move to review model ' + group.name
      nameElement.addEventListener('click', this.createGroupChangeEventHandler(group.id))
      //PVSCL:IFCOND(RenameGroup or ExportGroup or DropGroup,LINE)
      // Toggle
      groupSelectorItem.querySelector('.groupSelectorItemToggle').addEventListener('click', this.createGroupSelectorItemToggleEventHandler(group.id))
      // Options
      //PVSCL:IFCOND(RenameGroup,LINE)
      groupSelectorItem.querySelector('.renameGroup').addEventListener('click', this.createGroupSelectorRenameOptionEventHandler(group))
      //PVSCL:ENDCOND
      //PVSCL:IFCOND(ExportGroup,LINE)
      groupSelectorItem.querySelector('.exportGroup').addEventListener('click', this.createGroupSelectorExportOptionEventHandler(group))
      //PVSCL:ENDCOND
      //PVSCL:IFCOND(DropGroup,LINE)
      groupSelectorItem.querySelector('.deleteGroup').addEventListener('click', this.createGroupSelectorDeleteOptionEventHandler(group))
      //PVSCL:ENDCOND
      //PVSCL:ENDCOND
    }
    //PVSCL:IFCOND(CreateGroup,LINE)
    // New group button
    let newGroupButton = document.createElement('div')
    newGroupButton.innerText = 'Create review model'
    newGroupButton.id = 'createNewModelButton'
    newGroupButton.className = 'groupSelectorButton'
    newGroupButton.title = 'Create a new review model'
    newGroupButton.addEventListener('click', this.createNewReviewModelEventHandler())
    groupsContainer.appendChild(newGroupButton)
    //PVSCL:ENDCOND
    //PVSCL:IFCOND(ImportGroup,LINE)
    // Import button
    let importGroupButton = document.createElement('div')
    importGroupButton.className = 'groupSelectorButton'
    importGroupButton.innerText = 'Import review model'
    importGroupButton.id = 'importReviewModelButton'
    importGroupButton.addEventListener('click', this.createImportGroupButtonEventHandler())
    groupsContainer.appendChild(importGroupButton)
    //PVSCL:ENDCOND
  }

  createGroupSelectorToggleEvent () {
    return (e) => {
      this.toggleGroupSelectorContainer()
    }
  }

  toggleGroupSelectorContainer () {
    let groupSelector = document.querySelector('#groupSelector')
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

  setCurrentGroup (groupId, callback) {
    // Set current group
    let newCurrentGroup = _.find(this.groups, (group) => { return group.id === groupId })
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
//PVSCL:IFCOND(RenameGroup or ExportGroup or DropGroup,LINE)

  createGroupSelectorItemToggleEventHandler (groupId) {
    return (e) => {
      let groupSelectorItemContainer = document.querySelector('#groupSelectorContainerSelector').querySelector('#groupSelectorItemContainer_' + groupId)
      if (groupSelectorItemContainer.getAttribute('aria-expanded') === 'true') {
        groupSelectorItemContainer.setAttribute('aria-expanded', 'false')
      } else {
        groupSelectorItemContainer.setAttribute('aria-expanded', 'true')
      }
    }
  }
//PVSCL:ENDCOND
//PVSCL:IFCOND(RenameGroup,LINE)

  createGroupSelectorRenameOptionEventHandler (group) {
    return () => {
      this.renameGroup(group, (err, renamedGroup) => {
        if (err) {
          Alerts.errorAlert({text: 'Unable to rename group. Error: ' + err.message})
        } else {
          this.currentGroup = renamedGroup
          this.retrieveGroups(() => {
            this.reloadGroupsContainer(() => {
              this.container.setAttribute('aria-expanded', 'true')
              window.abwa.sidebar.openSidebar()
            })
          })
        }
      })
    }
  }
//PVSCL:ENDCOND
//PVSCL:IFCOND(ExportGroup,LINE)

  createGroupSelectorExportOptionEventHandler (group) {
    return () => {
      this.exportCriteriaConfiguration(group, (err) => {
        if (err) {
          Alerts.errorAlert({text: 'Error when trying to export review model. Error: ' + err.message})
        }
      })
    }
  }
//PVSCL:ENDCOND
//PVSCL:IFCOND(DropGroup,LINE)

  createGroupSelectorDeleteOptionEventHandler (group) {
    return (e) => {
      this.deleteGroup(group, (err) => {
        if (err) {
          Alerts.errorAlert({text: 'Error when deleting the group: ' + err.message})
        } else {
          // If removed group is the current group, current group must defined again
          if (group.id === this.currentGroup.id) {
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
      })
    }
  }
//PVSCL:ENDCOND
//PVSCL:IFCOND(CreateGroup,LINE)

  createNewReviewModelEventHandler () {
    return () => {
      this.createNewGroup((err, result) => {
        if (err) {
          Alerts.errorAlert({text: 'Unable to create a new group. Please try again or contact developers if the error continues happening.'})
        } else {
          // Update list of groups from storage
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
      title: 'Create a new review model',
      inputPlaceholder: 'Type here the name of your new review model...',
      preConfirm: (groupName) => {
        if (_.isString(groupName)) {
          if (groupName.length <= 0) {
            const swal = require('sweetalert2')
            swal.showValidationMessage('Name cannot be empty.')
          } else if (groupName.length > 25) {
            const swal = require('sweetalert2')
            swal.showValidationMessage('The review model name cannot be higher than 25 characters.')
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
          window.abwa.storageManager.client.createNewGroup({
            name: groupName,
            description: 'A group to conduct a review'
          }, callback)
        }
      }
    })
  }
//PVSCL:ENDCOND
//PVSCL:IFCOND(ImportGroup,LINE)

  createImportGroupButtonEventHandler () {
    return (e) => {
      this.importCriteriaConfiguration()
    }
  }

  importCriteriaConfiguration () {
    ImportSchema.askUserForConfigurationSchema((err, jsonObject) => {
      if (err) {
        Alerts.errorAlert({text: 'Unable to parse json file. Error:<br/>' + err.message})
      } else {
        Alerts.inputTextAlert({
          alertType: Alerts.alertType.warning,
          title: 'Give a name to your imported review model',
          text: 'When the configuration is imported a new highlighter is created. You can return to your other review models using the sidebar.',
          inputPlaceholder: 'Type here the name of your review model...',
          preConfirm: (groupName) => {
            if (_.isString(groupName)) {
              if (groupName.length <= 0) {
                const swal = require('sweetalert2')
                swal.showValidationMessage('Name cannot be empty.')
              } else if (groupName.length > 25) {
                const swal = require('sweetalert2')
                swal.showValidationMessage('The review model name cannot be higher than 25 characters.')
              } else {
                return groupName
              }
            }
          },
          callback: (err, reviewName) => {
            if (err) {
              window.alert('Unable to load alert. Unexpected error, please contact developer.')
            } else {
              window.abwa.storageManager.client.createNewGroup({name: reviewName}, (err, newGroup) => {
                if (err) {
                  Alerts.errorAlert({text: 'Unable to create a new annotation group. Error: ' + err.message})
                } else {
                  let guide = AnnotationGuide.fromUserDefinedHighlighterDefinition(jsonObject)
                  AnnotationGuide.setStorage(newGroup, (storage) => {
                    guide.storage = storage
                    Alerts.loadingAlert({
                      title: 'Configuration in progress',
                      text: 'We are configuring everything to start reviewing.',
                      position: Alerts.position.center
                    })
                    ImportSchema.createConfigurationAnnotationsFromReview({
                      guide,
                      callback: (err, annotations) => {
                        if (err) {
                          Alerts.errorAlert({text: 'There was an error when configuring Review&Go highlighter'})
                        } else {
                          Alerts.closeAlert()
                          // Update groups from storage
                          this.retrieveGroups(() => {
                            this.setCurrentGroup(guide.storage.group.id)
                          })
                        }
                      }
                    })
                  })
                }
              })
            }
          }
        })
      }
    })
  }
//PVSCL:ENDCOND

  updateCurrentGroupHandler (groupId) {
    this.currentGroup = _.find(this.groups, (group) => { return groupId === group.id })
    ChromeStorage.setData(this.selectedGroupNamespace, {data: JSON.stringify(this.currentGroup)}, ChromeStorage.local, () => {
      console.debug('Group updated. Name: %s id: %s', this.currentGroup.name, this.currentGroup.id)
      // Dispatch event
      LanguageUtils.dispatchCustomEvent(Events.groupChanged, {
        group: this.currentGroup,
        time: new Date()
      })
    })
  }
// PVSCL:ENDCOND

  retrieveGroups (callback) {
    window.abwa.storageManager.client.getListOfGroups({}, (err, groups) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        this.groups = groups
        //PVSCL:IFCOND(Hypothesis,LINE)
        // Remove public group in hypothes.is and modify group URL
        if (LanguageUtils.isInstanceOf(window.abwa.storageManager, HypothesisClientManager)) {
          _.remove(this.groups, (group) => {
            return group.id === '__world__'
          })
          _.forEach(this.groups, (group) => {
            if (_.has(group, 'links.html')) {
              group.links.html = group.links.html.substr(0, group.links.html.lastIndexOf('/'))
            }
          })
        }
        //PVSCL:ENDCOND
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
  //PVSCL:IFCOND( ExportGroup, LINE)

  exportCriteriaConfiguration (group, callback) {
    // Retrieve group annotations
    window.abwa.tagManager.getHighlighterDefinition(group, (err, groupAnnotations) => {
      if (err) {
        Alerts.errorAlert({text: 'Unable to export group.'})
      } else {
        // Export scheme
        ExportSchema.exportConfigurationSchemaToJSONFile(groupAnnotations, group)
      }
    })
  }
  //PVSCL:ENDCOND
  //PVSCL:IFCOND( RenameGroup, LINE)

  renameGroup (group, callback) {
    Alerts.inputTextAlert({
      title: 'Rename review model ' + group.name,
      inputPlaceholder: 'Type here the name of your new review model...',
      inputValue: group.name,
      preConfirm: (groupName) => {
        if (_.isString(groupName)) {
          if (groupName.length <= 0) {
            const swal = require('sweetalert2')
            swal.showValidationMessage('Name cannot be empty.')
          } else if (groupName.length > 25) {
            const swal = require('sweetalert2')
            swal.showValidationMessage('The review model name cannot be higher than 25 characters.')
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
          window.abwa.storageManager.client.updateGroup(group.id, {
            name: groupName,
            description: group.description || 'A Review&Go group to conduct a review'
          }, callback)
        }
      }
    })
  }
//PVSCL:ENDCOND
//PVSCL:IFCOND( DropGroup, LINE)

  deleteGroup (group, callback) {
    Alerts.confirmAlert({
      title: 'Deleting review model ' + group.name,
      text: 'Are you sure that you want to delete the review model. You will lose all the review model and all the annotations done with this review model in all the documents.',
      alertType: Alerts.alertType.warning,
      callback: () => {
        window.abwa.storageManager.client.removeAMemberFromAGroup({id: group.id, user: this.user}, (err) => {
          if (_.isFunction(callback)) {
            if (err) {
              callback(err)
            } else {
              callback(null)
            }
          }
        })
      }
    })
  }
//PVSCL:ENDCOND

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

module.exports = GroupSelector
