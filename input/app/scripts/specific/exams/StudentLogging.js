const Config = require('../../Config')
const _ = require('lodash')

class StudentLogging {
  constructor () {
    this.tags = {
      reviewed: Config.exams.namespace + ':' + Config.exams.tags.statics.reviewed
    }
  }

  init (callback) {
    // Check if user has a reviewed annotation already in the document
    window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({
      url: window.abwa.contentTypeManager.getDocumentURIToSearchInHypothesis(),
      tag: Config.exams.namespace + ':' + Config.exams.tags.statics.reviewed
    }, (err, annotations) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        let annotation = this.generateLoggingAnnotation()
        if (annotations.length === 0) {
          window.abwa.hypothesisClientManager.hypothesisClient.createNewAnnotation(annotation, (err, annotation) => {
            if (err) {
              if (_.isFunction(callback)) {
                callback(err)
              }
            } else {
              console.debug('Created logging annotation: ')
              console.debug(annotation)
              if (_.isFunction(callback)) {
                callback()
              }
            }
          })
        } else {
          // Update current annotation
          window.abwa.hypothesisClientManager.hypothesisClient.updateAnnotation(annotations[0].id, annotation, (err, annotation) => {
            if (err) {
              if (_.isFunction(callback)) {
                callback(err)
              }
            } else {
              console.debug('Created logging annotation: ')
              console.debug(annotation)
              if (_.isFunction(callback)) {
                callback()
              }
            }
          })
        }
      }
    })
  }

  generateLoggingAnnotation () {
    return {
      group: window.abwa.groupSelector.currentGroup.id,
      permissions: {
        read: ['group:' + window.abwa.groupSelector.currentGroup.id]
      },
      references: [],
      tags: [this.tags.reviewed],
      target: [],
      text: '',
      uri: window.abwa.contentTypeManager.getDocumentURIToSearchInHypothesis() // Current url
    }
  }

  destroy () {
    // Nothing to do yet
  }
}

module.exports = StudentLogging
