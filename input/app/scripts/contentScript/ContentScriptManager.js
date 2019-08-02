const _ = require('lodash')
const ContentTypeManager = require('./ContentTypeManager')
const Sidebar = require('./Sidebar')
const TagManager = require('./TagManager')
// const RolesManager = require('./RolesManager')
const GroupSelector = require('../groupManipulation/GroupSelector')
const AnnotationBasedInitializer = require('./AnnotationBasedInitializer')
// PVSCL:IFCOND(Hypothesis, LINE)
const HypothesisClientManager = require('../storage/hypothesis/HypothesisClientManager')
//PVSCL:ENDCOND
// PVSCL:IFCOND(Local, LINE)
const LocalStorageManager = require('../storage/local/LocalStorageManager')
//PVSCL:ENDCOND
const Config = require('../Config')
const Toolset = require('./Toolset')
const TextAnnotator = require('./contentAnnotators/TextAnnotator')
// PVSCL:IFCOND(UserFilter, LINE)
const UserFilter = require('../consumption/filters/UserFilter')
// PVSCL:ENDCOND
const Events = require('./Events')

class ContentScriptManager {
  constructor () {
    this.events = {}
    this.status = ContentScriptManager.status.notInitialized
  }

  init () {
    console.debug('Initializing content script manager')
    this.status = ContentScriptManager.status.initializing
    this.loadContentTypeManager(() => {
      this.loadStorage(() => {
        window.abwa.sidebar = new Sidebar()
        window.abwa.sidebar.init(() => {
          window.abwa.annotationBasedInitializer = new AnnotationBasedInitializer()
          window.abwa.annotationBasedInitializer.init(() => {
            window.abwa.groupSelector = new GroupSelector()
            window.abwa.groupSelector.init(() => {
              // Reload for first time the content by group
              this.reloadContentByGroup()
              //PVSCL:IFCOND(Manual,LINE)
              // Initialize listener for group change to reload the content
              this.initListenerForGroupChange()
              //PVSCL:ENDCOND        
            })
          })
        })
      })
    })
  }
//PVSCL:IFCOND(Manual, LINE)

  initListenerForGroupChange () {
    this.events.groupChangedEvent = this.groupChangedEventHandlerCreator()
    document.addEventListener(Events.groupChanged, this.events.groupChangedEvent, false)
  }

  groupChangedEventHandlerCreator () {
    return (event) => {
      this.reloadContentByGroup()
    }
  }
//PVSCL:ENDCOND

  reloadContentByGroup (callback) {
    // TODO Use async await or promises
    this.reloadRolesManager((err) => {
      if (err) {
        // TODO Error
      } else {
        this.reloadTagsManager((err) => {
          if (err) {
            // TODO Error
          } else {
            this.reloadContentAnnotator((err) => {
              if (err) {
                // TODO Error
              } else {
                this.reloadToolset((err) => {
                  if (err) {
                    // TODO Error
                  } else {
                    // PVSCL:IFCOND(UserFilter, LINE)
                    this.reloadUserFilter((err) => {
                      if (err) {
                        // TODO Error
                      } else {
                        this.status = ContentScriptManager.status.initialized
                        console.debug('Initialized content script manager')
                      }
                    })
                    // PVSCL:ELSECOND
                    this.status = ContentScriptManager.status.initialized
                    console.debug('Initialized content script manager')
                    // PVSCL:ENDCOND
                  }
                })
              }
            })
          }
        })
      }
    })
  }

  reloadContentAnnotator (callback) {
    // Destroy current content annotator
    this.destroyContentAnnotator()
    // Create a new content annotator for the current group
    window.abwa.contentAnnotator = new TextAnnotator(Config) // TODO Depending on the type of annotator
    window.abwa.contentAnnotator.init(callback)
  }

  reloadTagsManager (callback) {
    // Destroy current tag manager
    this.destroyTagsManager()
    // Create a new tag manager for the current group
    window.abwa.tagManager = new TagManager(Config.namespace, Config.tags) // TODO Depending on the type of annotator
    window.abwa.tagManager.init(callback)
  }
//PVSCL:IFCOND(UserFilter, LINE)

  reloadUserFilter (callback) {
    // Destroy current augmentation operations
    this.destroyUserFilter()
    // Create augmentation operations for the current group
    window.abwa.userFilter = new UserFilter(Config)
    window.abwa.userFilter.init(callback)
  }

  destroyUserFilter () {
    // Destroy current augmentation operations
    if (!_.isEmpty(window.abwa.userFilter)) {
      window.abwa.userFilter.destroy()
    }
  }
//PVSCL:ENDCOND

  destroyContentAnnotator () {
    // Destroy current content annotator
    if (!_.isEmpty(window.abwa.contentAnnotator)) {
      window.abwa.contentAnnotator.destroy()
    }
  }

  destroyTagsManager () {
    if (!_.isEmpty(window.abwa.tagManager)) {
      window.abwa.tagManager.destroy()
    }
  }

  destroy (callback) {
    console.debug('Destroying content script manager')
    this.destroyContentTypeManager(() => {
      this.destroyTagsManager()
      this.destroyContentAnnotator()
      //PVSCL:IFCOND(UserFilter, LINE)
      this.destroyUserFilter()
      //PVSCL:ENDCOND
      // TODO Destroy groupSelector, roleManager,
      window.abwa.groupSelector.destroy(() => {
        window.abwa.sidebar.destroy(() => {
          this.destroyStorage(() => {
            this.status = ContentScriptManager.status.notInitialized
            console.debug('Correctly destroyed content script manager')
            if (_.isFunction(callback)) {
              callback()
            }
          })
        })
      })
      //PVSCL:IFCOND(Manual, LINE)
      document.removeEventListener(Events.groupChanged, this.events.groupChangedEvent)
      //PVSCL:ENDCOND
    })
  }

  loadToolset (callback) {
    window.abwa.toolset = new Toolset()
    window.abwa.toolset.init(callback)
  }

  loadContentTypeManager (callback) {
    window.abwa.contentTypeManager = new ContentTypeManager()
    window.abwa.contentTypeManager.init(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  destroyContentTypeManager (callback) {
    if (window.abwa.contentTypeManager) {
      window.abwa.contentTypeManager.destroy(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      })
    }
  }

  reloadRolesManager (callback) {
    if (_.isFunction(callback)) {
      callback()
    }
  }

  reloadToolset (callback) {
    // Destroy toolset
    this.destroyToolset()
    // Create a new toolset
    this.loadToolset(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  destroyToolset () {
    if (window.abwa.toolset) {
      window.abwa.toolset.destroy()
    }
  }

  loadStorage (callback) {
    // PVSCL:IFCOND(Hypothesis, LINE)
    window.abwa.storageManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Local, LINE)
    window.abwa.storageManager = new LocalStorageManager()
    // PVSCL:ENDCOND
    window.abwa.storageManager.init((err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      }
    })
  }

  destroyStorage (callback) {
    if (window.abwa.storageManager) {
      window.abwa.storageManager.destroy(callback)
    }
  }
}

ContentScriptManager.status = {
  initializing: 'initializing',
  initialized: 'initialized',
  notInitialized: 'notInitialized'
}

module.exports = ContentScriptManager
