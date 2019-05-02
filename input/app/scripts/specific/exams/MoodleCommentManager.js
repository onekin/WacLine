const Alerts = require('../../utils/Alerts')
const MoodleClientManager = require('../../moodle/MoodleClientManager')
const Events = require('../../contentScript/Events')
const _ = require('lodash')
const MoodleUtils = require('../../moodle/MoodleUtils')

class MoodleCommentManager {
  constructor () {
    this.moodleClientManager = null
    this.events = {}
  }

  init (callback) {
    this.moodleClientManager = new MoodleClientManager(window.abwa.rubricManager.rubric.moodleEndpoint)
    this.moodleClientManager.init(() => {
      // Create event for replies
      this.events.replying = {
        element: document,
        event: Events.reply,
        handler: this.replyAnnotationEventHandler((err) => {
          if (err) {
            Alerts.errorAlert({text: err.message})
          } else {
            //
          }
        })
      }
      this.events.replying.element.addEventListener(this.events.replying.event, this.events.replying.handler, false)
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  replyAnnotationEventHandler (callback) {
    return (event) => {
      // Construct annotation link
      let url = MoodleUtils.createURLForAnnotation({
        annotation: event.detail.annotation,
        studentId: window.abwa.contentTypeManager.fileMetadata.studentId,
        cmid: window.abwa.contentTypeManager.fileMetadata.cmid,
        courseId: window.abwa.contentTypeManager.fileMetadata.courseId
      })
      // Construct text to send to moodle
      let text = '<a href="' + url + '">' + event.detail.replyAnnotation.text + '</a>'
      // Check if it is needed to update or is a new comment
      if (event.detail.replyType === 'new') {
        // Call moodle api to create a new comment
        this.moodleClientManager.addSubmissionComment({
          courseId: window.abwa.contentTypeManager.fileMetadata.courseId,
          text: text,
          studentId: window.abwa.contentTypeManager.fileMetadata.studentId,
          itemId: '',
          contextId: '',
          callback: callback
        })
      } else if (event.detail.replyType === 'update') {
        // TODO Edit current reply
      }
    }
  }

  destroy (callback) {
    // Remove the event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

module.exports = MoodleCommentManager
