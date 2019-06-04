const _ = require('lodash')
const ContentTypeManager = require('./ContentTypeManager')
const Sidebar = require('./Sidebar')
const MyTagManager = require('./MyTagManager')
const ModeManager = require('./ModeManager')
const RolesManager = require('./RolesManager')
const GroupSelector = require('../groupManipulation/GroupSelector')
const AnnotationBasedInitializer = require('./AnnotationBasedInitializer')
const HypothesisClientManager = require('../hypothesis/HypothesisClientManager')
const Config = require('../Config')
const Toolset = require('./Toolset')
const TextAnnotator = require('./contentAnnotators/TextAnnotator')

class ContentScriptManager {
  constructor () {
    this.events = {}
    this.status = ContentScriptManager.status.notInitialized
  }

  init () {
    console.debug('Initializing content script manager')
    this.status = ContentScriptManager.status.initializing
    this.loadContentTypeManager(() => {
      window.abwa.hypothesisClientManager = new HypothesisClientManager()
      window.abwa.hypothesisClientManager.init(() => {
        window.abwa.sidebar = new Sidebar()
        window.abwa.sidebar.init(() => {
          window.abwa.annotationBasedInitializer = new AnnotationBasedInitializer()
          window.abwa.annotationBasedInitializer.init(() => {
            window.abwa.groupSelector = new GroupSelector()
            window.abwa.groupSelector.init(() => {
              window.abwa.rolesManager = new RolesManager()
              window.abwa.rolesManager.init(() => {
                window.abwa.modeManager = new ModeManager()
                window.abwa.modeManager.init(() => {
                  // Load tag manager
                  window.abwa.tagManager = new MyTagManager()
                  window.abwa.tagManager.init(() => {
                    // Initialize sidebar toolset
                    this.initToolset()
                    // Load content annotator
                    window.abwa.contentAnnotator = new TextAnnotator(Config)
                    window.abwa.contentAnnotator.init(() => {
                      //PVSCL:IFCOND(Manual,LINE)
                      // Reload for first time the content by group
                      this.reloadContentByGroup()
                      // Initialize listener for group change to reload the content
                      this.initListenerForGroupChange()
                      //PVSCL:ENDCOND
                      this.status = ContentScriptManager.status.initialized
                      console.debug('Initialized content script manager')
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  }
//PVSCL:IFCOND(Manual, LINE)

  initListenerForGroupChange () {
    this.events.groupChangedEvent = this.groupChangedEventHandlerCreator()
    document.addEventListener(GroupSelector.eventGroupChange, this.events.groupChangedEvent, false)
  }

  groupChangedEventHandlerCreator () {
    return (event) => {
      this.reloadContentByGroup()
    }
  }

  reloadContentByGroup (callback) {
    // If not configuration is found
    if (_.isEmpty(Config)) {
      // TODO Inform user no defined configuration found
      console.debug('No supported configuration found for this group')
      this.destroyTagsManager()
      // this.destroyUserFilter()
      this.destroyContentAnnotator()
      this.destroyContentTypeManager()
    } else {
      console.debug('Loaded supported configuration %s', Config.namespace)
      // Tags manager should go before content annotator, depending on the tags manager, the content annotator can change
      this.reloadTagsManager(Config, () => {
        this.reloadContentAnnotator(Config, () => {
          this.loadContentTypeManager(Config)
        })
      })
    }
  }

  reloadContentAnnotator (config, callback) {
    // Destroy current content annotator
    this.destroyContentAnnotator()
    // Create a new content annotator for the current group
    window.abwa.contentAnnotator = new TextAnnotator(config) // TODO Depending on the type of annotator
    window.abwa.contentAnnotator.init(callback)
  }

  reloadTagsManager (config, callback) {
    // Destroy current tag manager
    this.destroyTagsManager()
    // Create a new tag manager for the current group
    window.abwa.tagManager = new MyTagManager(config.namespace, config.tags) // TODO Depending on the type of annotator
    window.abwa.tagManager.init(callback)
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
      // TODO Destroy groupSelector, roleManager,
      window.abwa.groupSelector.destroy(() => {
        window.abwa.sidebar.destroy(() => {
          window.abwa.hypothesisClientManager.destroy(() => {
            this.status = ContentScriptManager.status.notInitialized
            console.debug('Correctly destroyed content script manager')
            if (_.isFunction(callback)) {
              callback()
            }
          })
        })
      })
      document.removeEventListener(GroupSelector.eventGroupChange, this.events.groupChangedEvent)
    })
  }

  initToolset () {
    window.abwa.toolset = new Toolset()
    window.abwa.toolset.init()
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
}

ContentScriptManager.status = {
  initializing: 'initializing',
  initialized: 'initialized',
  notInitialized: 'notInitialized'
}

module.exports = ContentScriptManager
