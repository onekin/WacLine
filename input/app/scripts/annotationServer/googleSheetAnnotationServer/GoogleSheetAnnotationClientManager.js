import _ from 'lodash'

import GoogleSheetsManager from '../../background/GoogleSheetsManager'

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
    }, 1 * 30 * 1000) // TODO Change this
    this.logIn({}, callback)
  }

  reloadClient (callback) {
    this.isLoggedIn((err, isLogged) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (isLogged) {
          this.client = new GoogleSheetAnnotationClient(this.googleToken, this)
          this.client.init(() => {
            if (_.isFunction(callback)) {
              callback(null, this.googleToken)
            }
          })
        } else {
          this.logIn({ interactive: true }, callback)
        }
      }
    })
  }

  isLoggedIn (callback) {
    if (_.isFunction(callback)) {
      if (window.background) {
        if (window.background.googleSheetAnnotationManager.annotationServerManager.client) {
          if (_.has(window.background, 'googleSheetAnnotationManager.annotationServerManager.googleToken')) {
            GoogleSheetsManager.checkTokenIsStillActive(window.background.googleSheetAnnotationManager.annotationServerManager.googleToken, callback)
          } else {
            callback(null, false)
          }
        } else {
          callback(null, false)
        }
      } else {
        chrome.runtime.sendMessage({ scope: 'googleSheetAnnotation', cmd: 'getToken' }, ({ token }) => {
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
      chrome.identity.getAuthToken({ interactive: interactive }, (token) => {
        if (chrome.runtime.lastError) {
          callback(chrome.runtime.lastError)
        } else {
          GoogleSheetsManager.checkTokenIsStillActive(token, (err, result) => {
            if (err || !result) {
              console.error('Unable to verify if token is active or is inactive, retrieving a new one')
              GoogleSheetsManager.removeCachedToken(token, () => {
                chrome.identity.getAuthToken({ interactive: interactive }, (newToken) => {
                  this.googleToken = newToken
                  this.client = new GoogleSheetAnnotationClient(newToken, this)
                  this.client.init(() => {
                    if (_.isFunction(callback)) {
                      callback(null, newToken)
                    }
                  })
                })
              })
            } else {
              this.googleToken = token
              this.client = new GoogleSheetAnnotationClient(token, this)
              this.client.init(() => {
                if (_.isFunction(callback)) {
                  callback(null, token)
                }
              })
            }
          })
        }
      })
    } else {
      // Check if user is logged in googleSheet
      chrome.runtime.sendMessage({ scope: 'googleSheetAnnotation', cmd: 'getToken' }, ({ token }) => {
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
