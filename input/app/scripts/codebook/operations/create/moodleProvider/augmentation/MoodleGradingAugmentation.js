import _ from 'lodash'
import MoodleScraping from '../MoodleScraping'

class MoodleGradingAugmentation {
  init () {
    // Get course id
    MoodleScraping.scrapAssignmentData((err, assignmentData) => {
      if (err) {
        console.error(err.message)
      } else {
        const gradingTable = document.querySelector('.gradingtable')
        const tableBody = gradingTable.querySelector('tbody')
        let rows = tableBody.querySelectorAll(':scope > tr')
        // In moodle 3.1 are added some empty rows which are hidden
        rows = _.filter(rows, (row) => {
          return !row.classList.contains('emptyrow')
        })
        _.forEach(rows, (row) => {
          // Get student id
          const studentId = (new URL(row.querySelector('a[href*="/user/view.php"]').href)).searchParams.get('id')
          // Get student files
          const submittedFilesElements = row.querySelectorAll('a[href*="assignsubmission_file/submission_files"]')
          // Change URLs of files elements
          _.forEach(submittedFilesElements, (submittedFileElement) => {
            submittedFileElement.href = submittedFileElement.href + '#studentId:' +
              studentId + '&courseId:' + assignmentData.courseId + '&cmid:' + assignmentData.cmid
          })
          // When sent files are more than 5, files are not directly shown, you need to click and another website is opened with submitted files. See https://github.com/haritzmedina/MarkAndGo/issues/13
          const assignmentSubmissionElement = row.querySelector('a[href*="action=viewpluginassignsubmission"]')
          if (_.isElement(assignmentSubmissionElement)) {
            assignmentSubmissionElement.href = assignmentSubmissionElement.href + '&studentId=' + studentId
          }
        })
      }
    })
  }

  destroy () {

  }
}

export default MoodleGradingAugmentation
