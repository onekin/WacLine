const _ = require('lodash')
const Config = require('../Config')
// const Mark = require('./Mark')
const AnnotationGuide = require('../definition/AnnotationGuide')

const RETRIEVE_PREVIOUS_ASSIGNMENT_INTERVAL_IN_SECONDS = 60
// const RETRIEVE_ANNOTATIONS_FOR_ASSIGNMENT_INTERVAL_IN_SECONDS = 10

class PreviousAssignments {
  constructor () {
    this.previousAssignments = []
    this.intervals = {}
  }

  init () {
    // Load previous assignments
    this.retrievePreviousAssignments(() => {
      this.intervals.retrievePreviousAssignment = window.setInterval(() => {
        this.retrievePreviousAssignments()
      }, RETRIEVE_PREVIOUS_ASSIGNMENT_INTERVAL_IN_SECONDS * 1000)
    })
  }

  destroy () {
    if (this.intervals.retrievePreviousAssignment) {
      clearInterval(this.intervals.retrievePreviousAssignment)
    }
  }

  retrievePreviousAssignments (callback) {
    // Get student id
    let studentId = window.abwa.contentTypeManager.fileMetadata.studentId
    window.abwa.storageManager.client.searchAnnotations({
      tag: Config.namespace + ':guide',
      group: window.abwa.groupSelector.currentGroup.id
    }, (err, annotations) => {
      if (err) {
        // Nothing to do
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        let previousAssignments = []
        for (let i = 0; i < annotations.length; i++) {
          AnnotationGuide.fromAnnotation(annotations[i], (rubric) => {
            // If current assignment is previous assignment, don't add
            if (window.abwa.contentTypeManager.fileMetadata.cmid !== rubric.cmid) {
              let previousAssignment = {name: rubric.assignmentName}
              let teacherUrl = rubric.getUrlToStudentAssignmentForTeacher(studentId)
              let studentUrl = rubric.getUrlToStudentAssignmentForStudent(studentId)
              // If it is unable to retrieve the URL, don't add
              if (!_.isNull(teacherUrl) && !_.isNull(studentUrl)) {
                previousAssignment.teacherUrl = teacherUrl
                previousAssignment.studentUrl = studentUrl
                previousAssignments.push(previousAssignment)
              }
            }
          })
        }
        this.previousAssignments = previousAssignments
        console.debug('Updated previous assignments')
        if (_.isFunction(callback)) {
          callback(err)
        }
      }
    })
  }
}

module.exports = PreviousAssignments
