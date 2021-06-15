import _ from 'lodash'

import GoogleSheetAnnotationClient from './GoogleSheetAnnotationClient'
import GoogleSheetAnnotationClientInterface from './GoogleSheetAnnotationClientInterface'
import AnnotationServerManager from '../AnnotationServerManager'

class GoogleSheetAnnotationClientManager extends AnnotationServerManager {
  constructor () {
    super()
    this.client = null
    this.googleToken = null
    this.annotationServerMetadata = {
      annotationUrl: 'https://localannotationsdatabase.org/annotation/',
      groupUrl: 'https://docs.google.com/spreadsheets/d/',
      userUrl: 'https://localannotationsdatabase.org/user/',
      annotationServerUrl: 'https://docs.google.com/spreadsheets/'
    }
  }

  init (callback) {
    setInterval(() => {
      this.logIn({ interactive: false })
    }, 30 * 60 * 1000)
    this.logIn({}, callback)
  }

  isLoggedIn (callback) {
    if (_.isFunction(callback)) {
      if (_.has(window.background, 'googleSheetAnnotationManager.annotationServerManager.googleToken')) {
        callback(null, _.isString(window.background.googleSheetAnnotationManager.annotationServerManager.googleToken))
      } else {
        chrome.runtime.sendMessage({ scope: 'googleSheets', cmd: 'getToken' }, ({ token }) => {
          callback(null, !_.isEmpty(token))
        })
      }
    }
  }

  constructSearchUrl ({ groupId }) {
    return this.annotationServerManager.groupUrl + groupId
  }

  logIn ({ interactive = true }, callback) {
    if (window.background) {
      chrome.identity.getAuthToken({ interactive: interactive }, function (token) {
        if (chrome.runtime.lastError) {
          callback(chrome.runtime.lastError)
        } else {
          window.background.googleSheetAnnotationManager.annotationServerManager.googleToken = token
          window.background.googleSheetAnnotationManager.annotationServerManager.client = new GoogleSheetAnnotationClient(token, window.background.googleSheetAnnotationManager.annotationServerManager)
          if (_.isFunction(callback)) {
            callback(null, token)
          }
        }
      })
    } else {
      // Check if user is logged in googleSheet
      chrome.runtime.sendMessage({ scope: 'googleSheets', cmd: 'getToken' }, ({ token }) => {
        if (this.googleToken !== token) {
          this.googleToken = token
        }
        this.client = new GoogleSheetAnnotationClientInterface()
        if (_.isFunction(callback)) {
          callback(null, token)
        }
      })
    }
  }

  destroy (callback) {
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval)
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

export default GoogleSheetAnnotationClientManager
