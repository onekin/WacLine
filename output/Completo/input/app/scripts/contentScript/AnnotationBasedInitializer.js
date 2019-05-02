const _ = require('lodash')
const URLUtils = require('../utils/URLUtils')

class AnnotationBasedInitializer {
  constructor () {
    this.initAnnotation = null
  }

  init (callback) {
    // Check if annotation is in hash params
    let annotationId = AnnotationBasedInitializer.getAnnotationHashParam()
    if (annotationId) {
      if (_.isObject(window.abwa.hypothesisClientManager.hypothesisClient)) {
        window.abwa.hypothesisClientManager.hypothesisClient.fetchAnnotation(annotationId, (err, annotation) => {
          if (err) {
            console.error(err)
          } else {
            this.initAnnotation = annotation
          }
          if (_.isFunction(callback)) {
            callback(annotation)
          }
        })
      } else {
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    } else {
      if (_.isFunction(callback)) {
        callback(null)
      }
    }
  }

  static getAnnotationHashParam () {
    // Check if annotation is in hash params
    let decodedUri = decodeURIComponent(window.location.href)
    let params = URLUtils.extractHashParamsFromUrl(decodedUri)
    if (!_.isEmpty(params) && !_.isEmpty(params.hag)) {
      return params.hag
    } else {
      return false
    }
  }
}

module.exports = AnnotationBasedInitializer
