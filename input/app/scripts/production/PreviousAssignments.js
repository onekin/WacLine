const _ = require('lodash')
const Config = require('../Config')
const AnnotationGuide = require('../coodebook/Coodebook')

const RETRIEVE_PREVIOUS_ASSIGNMENT_INTERVAL_IN_SECONDS = 60

class PreviousAssignments {
  constructor () {
    this.previousAssignments = []
    this.intervals = {}
  }

  init (callback) {
    console.debug('Initializing previousAssignments')
    // Load previous assignments
    this.retrievePreviousAssignments(() => {
      console.debug('Initialized previousAssignments')
      if (_.isFunction(callback)) {
        callback()
      }
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
    let studentId = window.abwa.targetManager.fileMetadata.studentId
    window.abwa.annotationServerManager.client.searchAnnotations({
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
            if (window.abwa.targetManager.fileMetadata.cmid !== rubric.cmid) {
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
