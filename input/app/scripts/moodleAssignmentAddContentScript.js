import _ from 'lodash'

window.addEventListener('load', () => {
  console.debug('Loaded moodle assignment add content script')
  // Look for send students notifications
  const studentsNotificationsSelectElement = document.querySelector('#id_sendstudentnotifications')
  if (_.isElement(studentsNotificationsSelectElement)) {
    studentsNotificationsSelectElement.value = 0
    console.debug('Disabled automatic notification to students')
  }

  // Enable feedback comments
  const feedbackCommentsCheckElement = document.querySelector('#id_assignfeedback_comments_enabled')
  if (_.isElement(feedbackCommentsCheckElement)) {
    feedbackCommentsCheckElement.checked = true
    console.debug('Activated feedback comments to students')
  }
})
