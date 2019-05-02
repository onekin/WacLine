const _ = require('lodash')
const jsYaml = require('js-yaml')
// const StudentLogging = require('./StudentLogging')
const Config = require('../../Config')
const MoodleGradingManager = require('./MoodleGradingManager')
const MoodleCommentManager = require('./MoodleCommentManager')
const AssessmentManager = require('./AssessmentManager')

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
          window.abwa.specific = window.abwa.specific || {}

          window.abwa.specific.moodleGradingManager = new MoodleGradingManager()
          window.abwa.specific.moodleGradingManager.init()

          window.abwa.specific.assessmentManager = new AssessmentManager({
            cmid: window.abwa.rubricManager.rubric.cmid
          })
          window.abwa.specific.assessmentManager.init()

          // Toolset show
          window.abwa.toolset.show()
        } else { // Change to viewing mode
          window.abwa.specific = window.abwa.specific || {}
          window.abwa.tagManager.showViewingTagsContainer()
          window.abwa.sidebar.openSidebar()
          // Toolset hide
          window.abwa.toolset.hide()
          // Log student reviewed the exam
          // window.abwa.specific.studentLogging = new StudentLogging()
          // window.abwa.specific.studentLogging.init()
          if (_.isFunction(callback)) {
            callback()
          }
        }
        // Enable handler for replies
        window.abwa.specific.moodleCommentManager = new MoodleCommentManager()
        window.abwa.specific.moodleCommentManager.init()
      }
    })
  }

  currentUserIsTeacher (callback) {
    window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({
      url: window.abwa.groupSelector.currentGroup.url,
      order: 'desc',
      tags: Config.exams.namespace + ':' + Config.exams.tags.statics.teacher
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
      if (window.abwa.specific) {
        if (window.abwa.specific.moodleGradingManager) {
          window.abwa.specific.moodleGradingManager.destroy()
        }
      }
    } catch (e) {
      // TODO Show user need to reload the page?
    }
  }
}

module.exports = ExamDataExtractionContentScript
