import Commenting from '../purposes/Commenting'
import MoodleClientManager from '../../moodle/MoodleClientManager'
import Events from '../../Events'
import _ from 'lodash'
import MoodleUtils from '../../moodle/MoodleUtils'

class MoodleComment {
  constructor () {
    this.moodleClientManager = null
    this.events = {}
  }

  init (callback) {
    this.moodleClientManager = new MoodleClientManager(window.abwa.codebookManager.codebookReader.codebook.moodleEndpoint)
    this.moodleClientManager.init(() => {
      this.events.annotationCreatedEvent = { element: document, event: Events.annotationCreated, handler: this.createdAnnotationHandler() }
      this.events.annotationCreatedEvent.element.addEventListener(this.events.annotationCreatedEvent.event, this.events.annotationCreatedEvent.handler, false)
    })
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createdAnnotationHandler () {
    return (event) => {
      const annotation = event.detail.annotation
      // If annotation has references, means that it is an annotation replying another annotation
      if (annotation.references.length >= 1) {
        // Construct annotation link
        const url = MoodleUtils.createURLForAnnotation({
          annotation: event.detail.annotation,
          studentId: window.abwa.targetManager.fileMetadata.studentId,
          cmid: window.abwa.targetManager.fileMetadata.cmid,
          courseId: window.abwa.targetManager.fileMetadata.courseId
        })
        const commentingBody = annotation.getBodyForPurpose(Commenting.purpose)
        const text = '<a href="' + url + '">' + commentingBody.value + '</a>'
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
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

export default MoodleComment
