const _ = require('lodash')
const MoodleScraping = require('../MoodleScraping')

class MoodleViewPluginAssignSubmissionAugmentation {
  init () {
    // Get course id
    MoodleScraping.scrapAssignmentData((err, assignmentData) => {
      if (err) {

      } else {
        console.log(assignmentData)
        // Get current student id
        let studentId = (new URL(window.location)).searchParams.get('studentId')
        let submittedFilesElements = document.querySelectorAll('a[href*="assignsubmission_file/submission_files"')
        // Change URLs of files elements
        _.forEach(submittedFilesElements, (submittedFileElement) => {
          submittedFileElement.href = submittedFileElement.href + '#studentId:' +
            studentId + '&courseId:' + assignmentData.courseId + '&cmid:' + assignmentData.cmid
        })
      }
    })
  }

  destroy () {

  }
}

module.exports = MoodleViewPluginAssignSubmissionAugmentation
