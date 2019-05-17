const _ = require('lodash')
const ContentTypeManager = require('./ContentTypeManager')
const Sidebar = require('./Sidebar')
const MyTagManager = require('./MyTagManager')
const ModeManager = require('./ModeManager')
const RolesManager = require('./RolesManager')
const GroupSelector = require('./GroupSelector')
const AnnotationBasedInitializer = require('./AnnotationBasedInitializer')
const HypothesisClientManager = require('../hypothesis/HypothesisClientManager')
const Config = require('../Config')
const Toolset = require('./Toolset')

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
                    const TextAnnotator = require('./contentAnnotators/TextAnnotator')
                    window.abwa.contentAnnotator = new TextAnnotator(Config.review)
                    window.abwa.contentAnnotator.init(() => {
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
