const _ = require('lodash')

class MoodleScraping {
  static scrapAssignmentData (callback) {
    // Get assignment id and moodle endpoint
    if (window.location.href.includes('grade/grading/')) {
      let assignmentElement = document.querySelector('a[href*="mod/assign"]')
      let assignmentURL = assignmentElement.href
      // Get assignment name
      this.assignmentName = assignmentElement.innerText
      // Get assignment id
      this.cmid = (new URL(assignmentURL)).searchParams.get('id')
      // Get moodle endpoint
      this.moodleEndpoint = _.split(window.location.href, 'grade/grading/')[0]
      // Get course id
      let courseElement = document.querySelector('a[href*="course/view"]')
      this.courseId = (new URL(courseElement.href)).searchParams.get('id')
    } else if (window.location.href.includes('mod/assign/view')) {
      // Get assignment id
      this.cmid = (new URL(window.location)).searchParams.get('id')
      // Get moodle endpoint
      this.moodleEndpoint = _.split(window.location.href, 'mod/assign/view')[0]
      let assignmentElement = null
      // Get assignment name
      // Try moodle 3.5 in assignment main page
      let assignmentElementContainer = document.querySelector('ol.breadcrumb')
      if (assignmentElementContainer) { // Is moodle 3.5
        // Get assignment name
        assignmentElement = assignmentElementContainer.querySelector('a[href*="mod/assign"]')
        this.assignmentName = assignmentElement.innerText
        // Get course id
        let courseElement = assignmentElementContainer.querySelector('a[href*="course/view"]')
        this.courseId = (new URL(courseElement.href)).searchParams.get('id')
      }
      if (!_.isElement(assignmentElement)) {
        // Try moodle 3.1 in assignment main page
        let assignmentElementContainer = document.querySelector('ul.breadcrumb')
        if (assignmentElementContainer) {
          // Get assignment name
          assignmentElement = assignmentElementContainer.querySelector('a[href*="mod/assign"]')
          this.assignmentName = assignmentElement.innerText
          // Get course id
          let courseElement = assignmentElementContainer.querySelector('a[href*="course/view"]')
          this.courseId = (new URL(courseElement.href)).searchParams.get('id')
        }
        if (!_.isElement(assignmentElement)) {
          // Try moodle 3.5 in student grader page (action=grader)
          let assignmentElementContainer = document.querySelector('[data-region="assignment-info"]')
          if (assignmentElementContainer) {
            // Get assignment name
            assignmentElement = assignmentElementContainer.querySelector('a[href*="mod/assign"]')
            this.assignmentName = assignmentElement.innerText.split(':')[1].substring(1)
            // Get course id
            let courseElement = assignmentElementContainer.querySelector('a[href*="course/view"]')
            this.courseId = (new URL(courseElement.href)).searchParams.get('id')
          }
        }
      }
    }
    if (this.assignmentName && this.courseId && this.moodleEndpoint && this.cmid) {
      callback(null, {
        assignmentName: this.assignmentName,
        cmid: this.cmid,
        courseId: this.courseId,
        moodleEndpoint: this.moodleEndpoint
      })
    } else {
      callback(new Error(chrome.i18n.getMessage('MoodleWrongAssignmentPage')))
    }
  }
}

module.exports = MoodleScraping
