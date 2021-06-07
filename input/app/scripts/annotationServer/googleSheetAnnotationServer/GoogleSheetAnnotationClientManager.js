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
    if (window.background) {
      chrome.identity.getAuthToken({ interactive: true }, function (token) {
        if (chrome.runtime.lastError) {
          callback(chrome.runtime.lastError)
        } else {
          window.background.googleSheetAnnotationManager.annotationServerManager.googleToken = token
          window.background.googleSheetAnnotationManager.annotationServerManager.client = new GoogleSheetAnnotationClient(token, window.background.googleSheetAnnotationManager.annotationServerManager)
          if (_.isFunction(callback)) {
            callback()
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
          callback()
        }
      })
    }
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

  logIn (callback) {
    // TODO Check if user grant permission to access googleSheet account
    this.isLoggedIn((err, isLogged) => {
      if (err) {
        console.error(err)
      } else {
        if (!isLogged) {
          this.askUserToLogIngoogleSheet((err, token) => {
            if (err) {
              callback(err)
            } else {
              callback(null, token)
            }
          })
        } else {
          callback(null, this.googleSheetToken)
        }
      }
    })
  }

  askUserToLogIngoogleSheet (callback) {
    const swal = require('sweetalert2').default
    // Ask question
    swal({
      title: 'googlesheet login required', // TODO i18n
      text: chrome.i18n.getMessage('googleSheetLoginRequired'),
      type: 'info',
      showCancelButton: true
    }).then((result) => {
      if (result.value) {
        // Prompt googleSheet login form
        chrome.runtime.sendMessage({ scope: 'googleSheets', cmd: 'userLoginForm' }, (result) => {
          if (result.error) {
            if (_.isFunction(callback)) {
              callback(new Error(result.error))
            }
          } else {
            this.reloadClient(() => {
              if (_.isFunction(callback)) {
                callback(null, this.googleSheetToken)
              }
            })
          }
        })
      } else {
        callback(new Error('User don\'t want to log in googlesheet'))
      }
    })
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
