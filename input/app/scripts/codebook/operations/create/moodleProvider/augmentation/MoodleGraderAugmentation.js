import _ from 'lodash'
import MoodleScraping from '../MoodleScraping'

class MoodleGraderAugmentation {
  constructor () {
    this.studentChangeCheckerInterval = null
  }

  init () {
    // Handle change event (moodle grading page is dinamic, when changing from one student to the next one, it uses ajax to reload part of the site, but student id is different)
    this.initStudentChangeHandler({
      onChange: () => {
        this.augmentGraderPageFiles()
      }
    })
  }

  augmentGraderPageFiles () {
    // Get student ID
    this.getStudentId((err, studentId) => {
      if (err) {
        // TODO Alert user
        console.error('Unable to load student id')
      } else {
        this.modifySubmittedFilesUrl(studentId)
      }
    })
  }

  modifySubmittedFilesUrl (studentId) {
    // Get files elements
    this.waitUntilFilesAreLoaded((submissionFilesContainer) => {
      MoodleScraping.scrapAssignmentData((err, assignmentData) => {
        if (err) {
          console.error(err.message)
        } else {
          let fileItemId = this.getFileItemId()
          const submittedFilesElements = submissionFilesContainer.querySelectorAll('a')
          // Change URLs of files elements
          _.forEach(submittedFilesElements, (submittedFileElement) => {
            submittedFileElement.href = submittedFileElement.href + '#studentId:' +
              studentId + '&courseId:' + assignmentData.courseId + '&cmid:' + assignmentData.cmid
            if (fileItemId) {
              submittedFileElement.href += '&fileItemId:' + fileItemId
            }
          })
          console.debug('Modified submission files for current student ' + studentId)
        }
      })
    })
  }

  getFileItemId () {
    let fileItemElement = document.querySelector("input[id*='id_files_']")
    if (_.isElement(fileItemElement)) {
      return fileItemElement.value
    } else {
      return null
    }
  }

  waitUntilUserInfoIsLoaded (callback) {
    const interval = setInterval(() => {
      const currentUserInfoElement = document.querySelector('[data-region="user-info"]')
      if (_.isElement(currentUserInfoElement)) {
        clearInterval(interval)
        if (_.isFunction(callback)) {
          callback(currentUserInfoElement)
        }
      }
    }, 500)
  }

  waitUntilFilesAreLoaded (callback) {
    const interval = setInterval(() => {
      const submissionFilesContainer = document.querySelector('.assignsubmission_file')
      if (_.isElement(submissionFilesContainer)) {
        clearInterval(interval)
        if (_.isFunction(callback)) {
          callback(submissionFilesContainer)
        }
      }
    }, 500)
  }

  getStudentId (callback) {
    // Get student ID
    this.waitUntilUserInfoIsLoaded((currentUserInfoElement) => {
      const studentId = (new URL(currentUserInfoElement.querySelector('a').href)).searchParams.get('id')
      if (_.isFunction(callback)) {
        callback(null, studentId)
      }
    })
  }

  initStudentChangeHandler () {
    let savedStudentId = null
    this.studentChangeCheckerInterval = setInterval(() => {
      this.getStudentId((err, studentId) => {
        if (err) {
          console.error(err.message)
        } else {
          if (studentId !== savedStudentId) { // Student has changed
            savedStudentId = studentId // Save the new student id
            this.modifySubmittedFilesUrl(studentId)
          }
        }
      })
    }, 500)
  }

  destroy () {
    if (this.studentChangeCheckerInterval) {
      clearInterval(this.studentChangeCheckerInterval)
    }
  }
}

export default MoodleGraderAugmentation
