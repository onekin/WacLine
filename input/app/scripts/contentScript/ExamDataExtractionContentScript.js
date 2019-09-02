const _ = require('lodash')
const jsYaml = require('js-yaml')
const Config = require('../Config')
const PreviousAssignments = require('../production/PreviousAssignments')

class ExamDataExtractionContentScript {
  init (callback) {
    // Enable different functionality if current user is the teacher or student
    this.currentUserIsTeacher((err, isTeacher) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (isTeacher) { // Open modes
          window.abwa.moodle = window.abwa.moodle || {}

          window.abwa.moodle.previousAssignments = new PreviousAssignments()
          window.abwa.moodle.previousAssignments.init()
        }
      }
    })
  }

  currentUserIsTeacher (callback) {
    window.abwa.storageManager.client.searchAnnotations({
      url: window.abwa.groupSelector.currentGroup.links.html,
      order: 'desc',
      tags: Config.namespace + ':' + Config.tags.teacher
    }, (err, annotations) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (annotations.length > 0) {
          let params = jsYaml.load(annotations[0].text)
          callback(null, params.teacherId === window.abwa.groupSelector.user.userid) // Return if current user is teacher
        } else {
          if (_.isFunction(callback)) {
            callback(null)
          }
        }
      }
    })
  }

  destroy () {
    // TODO Destroy managers
    try {
      if (window.abwa.moodle) {
        if (window.abwa.moodle.previousAssignments) {
          window.abwa.moodle.previousAssignments.destroy()
        }
      }
    } catch (e) {
      // TODO Show user need to reload the page?
    }
  }
}

module.exports = ExamDataExtractionContentScript
