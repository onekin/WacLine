import _ from 'lodash'
import MoodleScraping from '../MoodleScraping'

class MoodleViewPluginAssignSubmissionAugmentation {
  init () {
    // Get course id
    MoodleScraping.scrapAssignmentData((err, assignmentData) => {
      if (err) {
        console.error(err.message)
      } else {
        console.log(assignmentData)
        // Get current student id
        const studentId = (new URL(window.location)).searchParams.get('studentId')
        const submittedFilesElements = document.querySelectorAll('a[href*="assignsubmission_file/submission_files"]')
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

export default MoodleViewPluginAssignSubmissionAugmentation
