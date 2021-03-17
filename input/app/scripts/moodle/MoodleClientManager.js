import MoodleClient from './MoodleClient'
import _ from 'lodash'
import MoodleFunctions from './MoodleFunctions'
import APISimulation from './APISimulation'
import Config from '../Config'
// const RolesManager = require('../contentScript/RolesManager')

class MoodleClientManager {
  constructor (moodleEndPoint) {
    if (_.isNull(moodleEndPoint)) {
      console.error('Moodle client manager requires a moodle endpoint')
    } else {
      this.moodleEndpoint = moodleEndPoint
    }
  }

  init (callback) {
    // Retrieve token from moodle
    chrome.runtime.sendMessage({ scope: 'moodle', cmd: 'getTokenForEndpoint', data: { endpoint: this.moodleEndpoint } }, (result) => {
      if (result.err) {
        callback(new Error('Unable to retrieve valid token'))
      } else {
        this.tokens = result.tokens
        this.moodleClient = new MoodleClient(this.moodleEndpoint)
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  getRubric (cmids, callback) {
    if (_.isFunction(callback)) {
      // Check if API simulation is enabled
      chrome.runtime.sendMessage({ scope: 'moodle', cmd: 'isApiSimulationActivated' }, (isActivated) => {
        if (isActivated.activated) {
          APISimulation.getRubric(cmids, callback)
        } else {
          const token = this.getTokenFor(MoodleFunctions.getRubric.wsFunc)
          if (_.isString(token)) {
            this.moodleClient.updateToken(token)
            this.moodleClient.getRubric(cmids, callback)
          } else {
            callback(new Error('NoPermissions'))
          }
        }
      })
    }
  }

  getCmidInfo (cmid, callback) {
    if (_.isFunction(callback)) {
      const token = this.getTokenFor(MoodleFunctions.getCourseModuleInfo.wsFunc)
      if (_.isString(token)) {
        this.moodleClient.updateToken(token)
        this.moodleClient.getCmidInfo(cmid, callback)
      } else {
        callback(new Error('NoPermissions'))
      }
    }
  }

  updateStudentGradeWithRubric (data, callback) {
    if (_.isFunction(callback)) {
      const token = this.getTokenFor(MoodleFunctions.updateStudentsGradeWithRubric.wsFunc)
      if (_.isString(token)) {
        this.moodleClient.updateToken(token)
        this.moodleClient.updateStudentGradeWithRubric(data, (err, data) => {
          if (err) {
            callback(err)
          } else {
            if (data === null) {
              callback(null)
            } else if (data.exception === 'dml_missing_record_exception') {
              callback(new Error(chrome.i18n.getMessage('ErrorSavingMarksInMoodle')))
            }
          }
        })
      } else {
        callback(new Error('NoPermissions'))
      }
    }
  }

  getStudents (courseId, callback) {
    if (_.isFunction(callback)) {
      const token = this.getTokenFor(MoodleFunctions.getStudents.wsFunc)
      if (_.isString(token)) {
        this.moodleClient.updateToken(token)
        this.moodleClient.getStudents(courseId, callback)
      } else {
        callback(new Error('NoPermissions'))
      }
    }
  }

  getTokenFor (wsFunction) {
    const tokenWrapper = _.find(this.tokens, (token) => {
      return _.find(token.tests, (test) => {
        return test.service === wsFunction && test.enabled
      })
    })
    if (tokenWrapper) {
      return tokenWrapper.token
    } else {
      return null
    }
  }

  addSubmissionComment ({ courseId, studentId, text, callback }) {
    APISimulation.addSubmissionComment(this.moodleEndpoint, {
      courseId,
      studentId,
      text,
      isTeacher: window.abwa.rolesManager.role === Config.tags.producer,
      callback,
      contextId: window.abwa.targetManager.fileMetadata.contextId,
      itemId: window.abwa.targetManager.fileMetadata.itemId
    }, callback)
  }

  addFeedbackSubmissionFile ({ file, callback }) {
    APISimulation.updateFeedbackSubmissionFile(this.moodleEndpoint, {
      contextId: window.abwa.targetManager.fileMetadata.contextId,
      itemId: window.abwa.targetManager.fileMetadata.itemId,
      file,
      author: 'Teacher Teacher',
      license: 'unknown'
    }, callback)
  }

  removeSubmissionComment ({ commentId, annotationId, callback }) {
    if (commentId) {
      // TODO Must be implemented in case of reply deletion is implemented, currently is not
    }
  }

  getSubmissionComments () {

  }

  getStudentPreviousSubmissions ({ studentId, course = null }) {

  }
}

export default MoodleClientManager
