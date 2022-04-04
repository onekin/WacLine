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
    console.debug('Initializing annotation based initializer')
    const annotationId = AnnotationBasedInitializer.getAnnotationHashParam()
    console.debug(annotationId)
    if (annotationId) {
      window.abwa.annotationServerManager.isLoggedIn((err, logged) => {
        console.log(logged)
        if (err || !logged) { // There was an error while checking login or is not logged in, ask for login
          window.abwa.annotationServerManager.logIn({}, (err, token) => {
            console.debug('Initialized annotation based initializer')
            if (err) {
              Alerts.errorAlert({ title: 'Log in is required', text: 'It is necessary to log in your annotation server.' })
            } else {
              // Reload web page
              document.location.reload()
            }
          })
        } else if (logged) { // Is logged in, retrieve annotation metadata
          window.abwa.annotationServerManager.client.fetchAnnotation(annotationId, (err, annotation) => {
            if (err) {
              Alerts.warningAlert({ title: 'Unable to retrieve annotation', text: 'We are unable to retrieve annotation with id ' + annotationId + ' from database, make sure you are correctly logged in.' })
            } else {
              this.initAnnotation = annotation
            }
            console.debug('Initialized annotation based initializer')
            if (_.isFunction(callback)) {
              callback(annotation)
            }
          })
        }
      })
    } else {
      console.debug('Initialized annotation based initializer')
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
