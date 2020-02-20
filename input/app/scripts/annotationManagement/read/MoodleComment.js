const Commenting = require('../purposes/Commenting')
const MoodleClientManager = require('../../moodle/MoodleClientManager')
const Events = require('../../Events')
const _ = require('lodash')
const MoodleUtils = require('../../moodle/MoodleUtils')

class MoodleComment {
  constructor () {
    this.moodleClientManager = null
    this.events = {}
  }

  init (callback) {
    this.moodleClientManager = new MoodleClientManager(window.abwa.codebookManager.codebookReader.codebook.moodleEndpoint)
    this.moodleClientManager.init(() => {
      this.events.annotationCreatedEvent = {element: document, event: Events.annotationCreated, handler: this.createdAnnotationHandler()}
      this.events.annotationCreatedEvent.element.addEventListener(this.events.annotationCreatedEvent.event, this.events.annotationCreatedEvent.handler, false)
    })
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createdAnnotationHandler () {
    return (event) => {
      let annotation = event.detail.annotation
      // If annotation has references, means that it is an annotation replying another annotation
      if (annotation.references.length >= 1) {
        // Construct annotation link
        let url = MoodleUtils.createURLForAnnotation({
          annotation: event.detail.annotation,
          studentId: window.abwa.targetManager.fileMetadata.studentId,
          cmid: window.abwa.targetManager.fileMetadata.cmid,
          courseId: window.abwa.targetManager.fileMetadata.courseId
        })
        let commentingBody = annotation.getBodyForPurpose(Commenting.purpose)
        let text = '<a href="' + url + '">' + commentingBody.value + '</a>'
        this.moodleClientManager.addSubmissionComment({
          courseId: window.abwa.targetManager.fileMetadata.courseId,
          text: text,
          studentId: window.abwa.targetManager.fileMetadata.studentId,
          itemId: '',
          contextId: ''
        })
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

module.exports = MoodleComment
