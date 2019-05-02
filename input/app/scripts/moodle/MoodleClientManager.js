const MoodleClient = require('./MoodleClient')
const _ = require('lodash')
const MoodleFunctions = require('./MoodleFunctions')
const APISimulation = require('./APISimulation')
const RolesManager = require('../contentScript/RolesManager')

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
    chrome.runtime.sendMessage({scope: 'moodle', cmd: 'getTokenForEndpoint', data: {endpoint: this.moodleEndpoint}}, (result) => {
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
      chrome.runtime.sendMessage({scope: 'moodle', cmd: 'isApiSimulationActivated'}, (isActivated) => {
        if (isActivated.activated) {
          APISimulation.getRubric(cmids, callback)
        } else {
          let token = this.getTokenFor(MoodleFunctions.getRubric.wsFunc)
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
      let token = this.getTokenFor(MoodleFunctions.getCourseModuleInfo.wsFunc)
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
      let token = this.getTokenFor(MoodleFunctions.updateStudentsGradeWithRubric.wsFunc)
      if (_.isString(token)) {
        this.moodleClient.updateToken(token)
        this.moodleClient.updateStudentGradeWithRubric(data, (err, data) => {
          if (err) {
            callback(err)
          } else {
            if (data === null) {
              callback(null)
            } else if (data.exception === 'dml_missing_record_exception') {
              callback(new Error(chrome.i18n.getMessage('ErrorSavingMarksInMoodle') + chrome.i18n.getMessage('ContactAdministrator')))
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
      let token = this.getTokenFor(MoodleFunctions.updateStudentsGradeWithRubric.wsFunc)
      if (_.isString(token)) {
        this.moodleClient.updateToken(token)
        this.moodleClient.getStudents(courseId, callback)
      } else {
        callback(new Error('NoPermissions'))
      }
    }
  }

  getTokenFor (wsFunction) {
    let tokenWrapper = _.find(this.tokens, (token) => {
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

  addSubmissionComment ({courseId, studentId, text, callback}) {
    APISimulation.addSubmissionComment(this.moodleEndpoint, {
      courseId,
      studentId,
      text,
      isTeacher: window.abwa.roleManager.role === RolesManager.roles.teacher,
      callback,
      contextId: window.abwa.contentTypeManager.fileMetadata.contextId,
      itemId: window.abwa.contentTypeManager.fileMetadata.itemId
    })
  }

  removeSubmissionComment ({commentId, annotationId, callback}) {
    if (commentId) {

    }
  }

  getSubmissionComments () {

  }

  getStudentPreviousSubmissions ({studentId, course = null}) {

  }
}

module.exports = MoodleClientManager
