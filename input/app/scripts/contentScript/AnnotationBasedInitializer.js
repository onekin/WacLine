const _ = require('lodash')
const URLUtils = require('../utils/URLUtils')
const Alerts = require('../utils/Alerts')
const Config = require('../Config')

class AnnotationBasedInitializer {
  constructor () {
    this.initAnnotation = null
  }

  init (callback) {
    // Check if annotation is in hash params
    let annotationId = AnnotationBasedInitializer.getAnnotationHashParam()
    if (annotationId) {
      if (window.abwa.hypothesisClientManager.isLoggedIn() === false) {
        window.abwa.hypothesisClientManager.logInHypothesis((err, token) => {
          if (err) {
            Alerts.errorAlert({title: 'Log in hypothes.is is required', text: 'To use Mark&Go it is necessary to log in Hypothes.is.'})
          } else {
            // Reload web page
            document.location.reload()
          }
        })
      } else {
        window.abwa.hypothesisClientManager.hypothesisClient.fetchAnnotation(annotationId, (err, annotation) => {
          if (err) {
            // Alerts.errorAlert({title: 'Unable to retrieve ',text:})
          } else {
            this.initAnnotation = annotation
          }
          if (_.isFunction(callback)) {
            callback(annotation)
          }
        })
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
    if (!_.isEmpty(params) && _.has(params, Config.urlParamName)) {
      return params[Config.urlParamName]
    } else {
      return false
    }
  }

  static isAutoOpenHashParam () {
    let decodedUri = decodeURIComponent(window.location.href)
    let params = URLUtils.extractHashParamsFromUrl(decodedUri)
    if (!_.isEmpty(params) && _.has(params, 'autoOpen')) {
      return params['autoOpen']
    } else {
      return false
    }
  }
}

module.exports = AnnotationBasedInitializer
