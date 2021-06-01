import _ from 'lodash'

import HypothesisClient from 'hypothesis-api-client'

import AnnotationServerManager from '../AnnotationServerManager'
import HypothesisClientInterface from './HypothesisClientInterface'

import Alerts from '../../utils/Alerts'

const reloadIntervalInSeconds = 1 // Reload the hypothesis client every 10 seconds

class HypothesisClientManager extends AnnotationServerManager {
  constructor () {
    super()
    this.client = null
    this.hypothesisToken = null
    this.reloadInterval = null
    this.annotationServerMetadata = {
      annotationUrl: 'https://hypothes.is/api/annotations/',
      annotationServerUrl: 'https://hypothes.is/api',
      groupUrl: 'https://hypothes.is/groups/',
      userUrl: 'https://hypothes.is/users/'
    }
  }

  init (callback) {
    if (window.background) {
      this.reloadClient(() => {
        // Start reloading of client
        this.reloadInterval = setInterval(() => {
          this.reloadClient()
        }, reloadIntervalInSeconds * 1000)
        if (_.isFunction(callback)) {
          callback()
        }
      })
    } else {
      // Check if user is logged in hypothesis
      chrome.runtime.sendMessage({ scope: 'hypothesis', cmd: 'getToken' }, ({ token }) => {
        if (this.hypothesisToken !== token) {
          this.hypothesisToken = token
        }
        this.client = new HypothesisClientInterface()
        if (_.isFunction(callback)) {
          callback()
        }
      })
    }
  }

  reloadClient (callback) {
    if (_.has(window.background, 'hypothesisManager')) {
      window.background.hypothesisManager.retrieveHypothesisToken((err, token) => {
        if (err) {
          this.client = new HypothesisClient()
          this.hypothesisToken = null
        } else {
          this.client = new HypothesisClient(token)
          this.hypothesisToken = token
        }
        if (_.isFunction(callback)) {
          callback()
        }
      })
    } else {
      chrome.runtime.sendMessage({ scope: 'hypothesis', cmd: 'getToken' }, ({ token }) => {
        if (this.hypothesisToken !== token) {
          this.hypothesisToken = token
          if (this.hypothesisToken) {
            this.client = new HypothesisClient(token)
          } else {
            this.client = new HypothesisClient()
          }
        }
        if (_.isFunction(callback)) {
          callback()
        }
      })
    }
  }

  isLoggedIn (callback) {
    if (_.isFunction(callback)) {
      if (_.has(window.background, 'hypothesisManager.hypothesisManagerOAuth.tokens')) {
        callback(null, _.isString(window.background.hypothesisManager.hypothesisManagerOAuth.tokens.accessToken))
      } else {
        chrome.runtime.sendMessage({ scope: 'hypothesis', cmd: 'getToken' }, ({ token }) => {
          callback(null, !_.isEmpty(token))
        })
      }
    }
  }

  constructSearchUrl ({ groupId }) {
    return this.annotationServerMetadata.groupUrl + groupId
  }

  logIn (callback) {
    // TODO Check if user grant permission to access hypothesis account
    this.isLoggedIn((err, isLogged) => {
      if (err) {
        console.error(err)
      } else {
        if (!isLogged) {
          this.askUserToLogInHypothesis((err, token) => {
            if (err) {
              callback(err)
            } else {
              callback(null, token)
            }
          })
        } else {
          callback(null, this.hypothesisToken)
        }
      }
    })
  }

  askUserToLogInHypothesis (callback) {
    Alerts.confirmAlert({
      alertType: Alerts.alertType.info,
      title: 'Log in required',
      text: chrome.i18n.getMessage('hypothesisLoginWillBeShown'),
      callback: () => {
        // Prompt hypothesis login form
        chrome.runtime.sendMessage({ scope: 'hypothesis', cmd: 'userLoginForm' }, (result) => {
          if (result.error) {
            if (_.isFunction(callback)) {
              callback(new Error(result.error))
            }
          } else {
            this.reloadClient(() => {
              if (_.isFunction(callback)) {
                callback(null, this.hypothesisToken)
              }
            })
          }
        })
      },
      cancelCallback: () => {
        callback(new Error('User don\'t want to log in hypothes.is'))
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

export default HypothesisClientManager
