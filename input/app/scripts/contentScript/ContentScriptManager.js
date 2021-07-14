import _ from 'lodash'
import TargetManager from '../target/TargetManager'
import Sidebar from './Sidebar'
import CodebookManager from '../codebook/CodebookManager'
import Config from '../Config'
import AnnotationBasedInitializer from './AnnotationBasedInitializer'
import AnnotationServerManagerInitializer from '../annotationServer/AnnotationServerManagerInitializer'
// PVSCL:IFCOND(Manual, LINE)
import Events from '../Events'
// PVSCL:ENDCOND
// PVSCL:IFCOND(MoodleResource, LINE)
import RolesManager from './RolesManager'
// PVSCL:ENDCOND
// PVSCL:IFCOND(PreviousAssignments, LINE)
import PreviousAssignments from '../annotationManagement/purposes/PreviousAssignments'
// PVSCL:ENDCOND
// PVSCL:IFCOND(GoogleSheetAnnotationServer, LINE)
import GoogleSheetAnnotationClientManager from '../annotationServer/googleSheetAnnotationServer/GoogleSheetAnnotationClientManager'
// PVSCL:ENDCOND
// PVSCL:IFCOND(GoogleSheetAuditLog, LINE)
import GoogleSheetAuditLogging from '../annotationManagement/read/GoogleSheetAuditLogging'
// PVSCL:ENDCOND

class ContentScriptManager {
  constructor () {
    this.events = {}
    this.status = ContentScriptManager.status.notInitialized
  }

  init () {
    console.debug('Initializing content script manager')
    this.status = ContentScriptManager.status.initializing
    this.loadTargetManager(() => {
      this.loadAnnotationServer(() => {
        window.abwa.sidebar = new Sidebar()
        window.abwa.sidebar.init(() => {
          window.abwa.annotationBasedInitializer = new AnnotationBasedInitializer()
          window.abwa.annotationBasedInitializer.init(() => {
            const GroupSelector = require('../groupManipulation/GroupSelector').default
            window.abwa.groupSelector = new GroupSelector()
            window.abwa.groupSelector.init(() => {
              // Reload for first time the content by group
              this.reloadContentByGroup()
              // PVSCL:IFCOND(Manual,LINE)
              // Initialize listener for group change to reload the content
              this.initListenerForGroupChange()
              // PVSCL:ENDCOND
            })
          })
        })
      })
    })
  }


  // PVSCL:IFCOND(Manual, LINE)

  initListenerForGroupChange () {
    this.events.groupChangedEvent = { element: document, event: Events.groupChanged, handler: this.groupChangedEventHandlerCreator() }
    this.events.groupChangedEvent.element.addEventListener(this.events.groupChangedEvent.event, this.events.groupChangedEvent.handler, false)
  }

  groupChangedEventHandlerCreator () {
    return (event) => {
      this.reloadContentByGroup()
    }
  }
  // PVSCL:ENDCOND

  reloadContentByGroup (callback) {
    let promise
    // PVSCL:IFCOND(GoogleSheetAnnotationServer, LINE)
    if (window.abwa.annotationServerManager instanceof GoogleSheetAnnotationClientManager) {
      promise = this.retrieveSpreadsheetAnnotationsToBrowserLocalStorage()
    } else {
      promise = new Promise((resolve) => { resolve() })
    }
    // PVSCL:ELSECOND
    promise = new Promise((resolve) => { resolve() })
    // PVSCL:ENDCOND
    // TODO Use async await or promises
    promise.then(() => {
      return this.reloadCodebookManager()
    })
      // PVSCL:IFCOND(MoodleResource, LINE)
      .then(() => {
        return this.reloadRolesManager()
      })
      // PVSCL:ENDCOND
      .then(() => {
        return this.reloadToolset()
      })
      .then(() => {
        return this.reloadAnnotationManagement()
      })
      // PVSCL:IFCOND(MoodleReport, LINE)
      .then(() => {
        return this.reloadMoodleReport()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(MoodleComment, LINE)
      .then(() => {
        return this.reloadMoodleComment()
      })
      // PVSCL:ENDCOND
      .then(() => {
        return this.reloadAnnotatedContentManager()
      })
      // PVSCL:IFCOND(MoodleResource, LINE)
      .then(() => {
        return this.reloadMoodleEstimationManager()
      })
      .then(() => {
        return this.reloadPreviousAssignments()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(GoogleSheetAuditLog, LINE)
      .then(() => {
        return this.reloadGoogleSheetAuditLogging()
      })
      // PVSCL:ENDCOND
      .then(() => {
        this.status = ContentScriptManager.status.initialized
        console.debug('Initialized content script manager')
      })
      .catch((err) => {
        if (err) {
          const Alerts = require('../utils/Alerts').default
          Alerts.errorAlert({
            text: 'Error while loading an extension module. Error: ' + err.message,
            title: 'Oops!'
          })
        }
      })
  }

  retrieveSpreadsheetAnnotationsToBrowserLocalStorage () {
    return new Promise((resolve, reject) => {
      window.abwa.annotationServerManager.client.reloadCacheDatabase(
        { user: window.abwa.groupSelector.user, group: window.abwa.groupSelector.currentGroup }
        , (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
    })
  }

  reloadAnnotatedContentManager () {
    return new Promise((resolve, reject) => {
      // Destroy annotated content manager
      this.destroyAnnotatedContentManager()
      // Create a new annotated content manager
      const { AnnotatedContentManager } = require('./AnnotatedContentManager')
      window.abwa.annotatedContentManager = new AnnotatedContentManager()
      window.abwa.annotatedContentManager.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  reloadAnnotationManagement () {
    return new Promise((resolve, reject) => {
      // Destroy current content annotator
      this.destroyAnnotationManagement()
      // Create a new content annotator for the current group
      const AnnotationManagement = require('../annotationManagement/AnnotationManagement').default
      window.abwa.annotationManagement = new AnnotationManagement()
      window.abwa.annotationManagement.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  reloadCodebookManager () {
    return new Promise((resolve, reject) => {
      // Destroy current tag manager
      this.destroyCodebookManager()
      // Create a new tag manager for the current group
      window.abwa.codebookManager = new CodebookManager(Config.namespace, Config.tags) // TODO Depending on the type of annotator
      window.abwa.codebookManager.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
  // PVSCL:IFCOND(GoogleSheetAuditLog, LINE)

  reloadGoogleSheetAuditLogging () {
    return new Promise((resolve, reject) => {
      this.destroyGoogleSheetAuditLogging()
      window.abwa.googleSheetAuditLogging = new GoogleSheetAuditLogging()
      window.abwa.googleSheetAuditLogging.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  destroyGoogleSheetAuditLogging () {
    if (window.abwa.googleSheetAuditLogging) {
      window.abwa.googleSheetAuditLogging.destroy()
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(MoodleReport, LINE)

  reloadMoodleReport () {
    return new Promise((resolve, reject) => {
      // Destroy current content annotator
      this.destroyMoodleReport()
      // Create a new content annotator for the current group
      const MoodleReport = require('../annotationManagement/read/MoodleReport').default
      window.abwa.moodleReport = new MoodleReport()
      window.abwa.moodleReport.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(MoodleComment, LINE)

  reloadMoodleComment () {
    return new Promise((resolve, reject) => {
      // Destroy current content annotator
      this.destroyMoodleComment()
      // Create a new content annotator for the current group
      const MoodleComment = require('../annotationManagement/read/MoodleComment').default
      window.abwa.moodleComment = new MoodleComment()
      window.abwa.moodleComment.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(MoodleResource, LINE)

  reloadRolesManager () {
    return new Promise((resolve, reject) => {
      // Destroy current content annotator
      this.destroyRolesManager()
      // Create a new content annotator for the current group
      window.abwa.rolesManager = new RolesManager()
      window.abwa.rolesManager.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  reloadMoodleEstimationManager () {
    return new Promise((resolve, reject) => {
      // Destroy current content annotator
      this.destroyMoodleEstimationManager()
      // Create a new content annotator for the current group
      const MoodleEstimationManager = require('../moodle/MoodleEstimationManager').default
      window.abwa.moodleEstimationManager = new MoodleEstimationManager()
      window.abwa.moodleEstimationManager.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
  // PVSCL:IFCOND(PreviousAssignments, LINE)

  reloadPreviousAssignments () {
    return new Promise((resolve, reject) => {
      // Destroy current content annotator
      this.destroyPreviousAssignments()
      // Create a new content annotator for the current group
      window.abwa.previousAssignments = new PreviousAssignments()
      window.abwa.previousAssignments.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND

  reloadToolset () {
    return new Promise((resolve, reject) => {
      // Destroy toolset
      this.destroyToolset()
      // Create a new toolset
      const Toolset = require('./Toolset').default
      window.abwa.toolset = new Toolset()
      window.abwa.toolset.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
  // PVSCL:IFCOND(MoodleReport, LINE)

  destroyMoodleReport () {
    // Destroy current augmentation operations
    if (!_.isEmpty(window.abwa.moodleReport)) {
      window.abwa.moodleReport.destroy()
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(MoodleComment, LINE)

  destroyMoodleComment () {
    // Destroy current augmentation operations
    if (!_.isEmpty(window.abwa.moodleComment)) {
      window.abwa.moodleComment.destroy()
    }
  }
  // PVSCL:ENDCOND

  destroyCodebookManager () {
    if (!_.isEmpty(window.abwa.codebookManager)) {
      window.abwa.codebookManager.destroy()
    }
  }

  destroyAnnotatedContentManager () {
    if (window.abwa.annotatedContentManager) {
      window.abwa.annotatedContentManager.destroy()
    }
  }
  // PVSCL:IFCOND(MoodleResource, LINE)

  destroyRolesManager () {
    // Destroy current augmentation operations
    if (window.abwa.rolesManager) {
      window.abwa.rolesManager.destroy()
    }
  }

  destroyMoodleEstimationManager () {
    if (window.abwa.moodleEstimationManager) {
      window.abwa.moodleEstimationManager.destroy()
    }
  }

  destroyPreviousAssignments () {
    // Destroy current augmentation operations
    if (window.abwa.previousAssignments) {
      window.abwa.previousAssignments.destroy()
    }
  }
  // PVSCL:ENDCOND

  destroyToolset () {
    if (window.abwa.toolset) {
      window.abwa.toolset.destroy()
    }
  }

  destroy (callback) {
    console.debug('Destroying content script manager')
    this.destroyTargetManager(() => {
      this.destroyCodebookManager()
      this.destroyAnnotationManagement()
      this.destroyToolset()
      // PVSCL:IFCOND(MoodleResource, LINE)
      this.destroyRolesManager()
      this.destroyPreviousAssignments()
      this.destroyMoodleEstimationManager()
      // PVSCL:ENDCOND
      // TODO Destroy groupSelector, sidebar,
      window.abwa.groupSelector.destroy(() => {
        window.abwa.sidebar.destroy(() => {
          this.destroyAnnotationServer(() => {
            this.status = ContentScriptManager.status.notInitialized
            console.debug('Correctly destroyed content script manager')
            if (_.isFunction(callback)) {
              callback()
            }
          })
        })
      })
      // PVSCL:IFCOND(Manual, LINE)
      document.removeEventListener(Events.groupChanged, this.events.groupChangedEvent)
      // PVSCL:ENDCOND
    })
  }

  loadTargetManager (callback) {
    window.abwa.targetManager = new TargetManager()
    window.abwa.targetManager.init(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  destroyTargetManager (callback) {
    if (window.abwa.targetManager) {
      window.abwa.targetManager.destroy(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      })
    }
  }

  loadAnnotationServer (callback) {
    AnnotationServerManagerInitializer.init((err, annotationServerManager) => {
      if (err) {
        callback(err)
      } else {
        window.abwa.annotationServerManager = annotationServerManager
        if (window.abwa.annotationServerManager) {
          window.abwa.annotationServerManager.init((err) => {
            if (_.isFunction(callback)) {
              if (err) {
                callback(err)
              } else {
                callback()
              }
            }
          })
        } else {
          const Alerts = require('../utils/Alerts').default
          Alerts.errorAlert({ text: 'Unable to load selected server. Please configure in <a href="' + chrome.extension.getURL('pages/options.html') + '">options page</a>.' })
        }
      }
    })
  }

  destroyAnnotationServer (callback) {
    if (window.abwa.annotationServerManager) {
      window.abwa.annotationServerManager.destroy(callback)
    }
  }

  destroyAnnotationManagement (callback) {
    if (window.abwa.annotationManagement) {
      window.abwa.annotationManagement.destroy(callback)
    }
  }
}

ContentScriptManager.status = {
  initializing: 'initializing',
  initialized: 'initialized',
  notInitialized: 'notInitialized'
}

export default ContentScriptManager
