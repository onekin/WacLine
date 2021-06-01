import _ from 'lodash'
import URLUtils from '../utils/URLUtils'
import Alerts from '../utils/Alerts'
import Config from '../Config'

class AnnotationBasedInitializer {
  constructor () {
    this.initAnnotation = null
  }

  init (callback) {
    // Check if annotation is in hash params
    const annotationId = AnnotationBasedInitializer.getAnnotationHashParam()
    if (annotationId) {
      if (window.abwa.annotationServerManager.isLoggedIn() === false) {
        window.abwa.annotationServerManager.logIn((err, token) => {
          if (err) {
            Alerts.errorAlert({ title: 'Log in is required', text: 'It is necessary to log in your annotation server.' })
          } else {
            // Reload web page
            document.location.reload()
          }
        })
      } else {
        window.abwa.annotationServerManager.client.fetchAnnotation(annotationId, (err, annotation) => {
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
    const decodedUri = decodeURIComponent(window.location.href)
    const params = URLUtils.extractHashParamsFromUrl(decodedUri)
    if (!_.isEmpty(params) && _.has(params, Config.urlParamName)) {
      return params[Config.urlParamName]
    } else {
      return false
    }
  }

  static isAutoOpenHashParam () {
    const decodedUri = decodeURIComponent(window.location.href)
    const params = URLUtils.extractHashParamsFromUrl(decodedUri)
    if (!_.isEmpty(params) && _.has(params, 'autoOpen')) {
      // Check if autoOpen is for you (see issue #99)
      // eslint-disable-next-line quotes
      return params.autoOpen === "PVSCL:EVAL(WebAnnotator.WebAnnotationClient->pv:Attribute('appShortName'))"
    } else {
      return false
    }
  }
}

export default AnnotationBasedInitializer
