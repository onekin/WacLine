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
    this.reloadInterval = null
    this.annotationServerMetadata = {
      annotationUrl: 'https://localannotationsdatabase.org/annotation/',
      groupUrl: 'https://docs.google.com/spreadsheets/d/',
      userUrl: 'https://localannotationsdatabase.org/user/',
      annotationServerUrl: 'https://docs.google.com/spreadsheets/'
    }
  }

  init (callback) {
    this.reloadInterval = setInterval(() => {
      this.reloadClient()
    }, 1 * 30 * 1000) // TODO Change this
    this.logIn({}, callback)
  }

  reloadClient (callback) {
    if (typeof window === 'undefined') {
      this.isLoggedIn((err, isLogged) => {
        if (err) {
          if (_.isFunction(callback)) {
            callback(err)
          }
        } else {
          if (isLogged) {
            if (this.client && this.client.token === this.googleToken) {
              // If client exists and has the same token as current, no need to reload the client
            } else {
              if (this.client) {
                this.client.destroy()
              }
              this.client = new GoogleSheetAnnotationClient(this.googleToken, this)
              this.client.init(() => {
                if (_.isFunction(callback)) {
                  callback(null, this.googleToken)
                }
              })
            }
          } else {
            this.logIn({ interactive: true }, callback)
          }
        }
      })
    } else {
      if (_.isFunction(callback)) {
        callback()
      }
    }
  }

  isLoggedIn (callback) {
    if (_.isFunction(callback)) {
      chrome.runtime.sendMessage({ scope: 'googleSheetAnnotation', cmd: 'isLoggedIn' }, (isLoggedIn) => {
        if (isLoggedIn.error) {
          callback(isLoggedIn.error)
        } else {
          callback(null, isLoggedIn)
        }
      })
    }
  }

  constructSearchUrl ({ groupId }) {
    return this.annotationServerManager.groupUrl + groupId
  }

  logIn ({ interactive = true }, callback) {
    debugger
    if (typeof window === 'undefined') {
      chrome.identity.getAuthToken({ interactive: interactive }, (token) => {
        if (chrome.runtime.lastError) {
          callback(chrome.runtime.lastError)
        } else {
          GoogleSheetsManager.checkTokenIsStillActive(token, (err, result) => {
            if (err || !result) {
              console.error('Unable to verify if token is active or is inactive, retrieving a new one')
              GoogleSheetsManager.removeCachedToken(token, () => {
                chrome.identity.getAuthToken({ interactive: interactive }, (newToken) => {
                  if (this.client) {
                    this.client.destroy()
                  }
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
              if (this.client) {
                this.client.destroy()
              }
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
      chrome.runtime.sendMessage({ scope: 'googleSheetAnnotation', cmd: 'logIn' }, ({ token }) => {
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
