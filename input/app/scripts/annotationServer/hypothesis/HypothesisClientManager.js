import _ from 'lodash'

import HypothesisClient from 'hypothesis-api-client'

import AnnotationServerManager from '../AnnotationServerManager'
import HypothesisClientInterface from './HypothesisClientInterface'

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
      chrome.runtime.sendMessage({ scope: 'hypothesis', cmd: 'getToken' }, (token) => {
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
      chrome.runtime.sendMessage({ scope: 'hypothesis', cmd: 'getToken' }, (tokens) => {
        if (this.hypothesisToken !== tokens.token) {
          this.hypothesisToken = tokens.token
          if (this.hypothesisToken) {
            this.client = new HypothesisClient(tokens.token)
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
      callback(null, !_.isEmpty(this.hypothesisToken))
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
    const swal = require('sweetalert2').default
    // Ask question
    swal({
      title: 'Hypothes.is login required', // TODO i18n
      text: chrome.i18n.getMessage('HypothesisLoginRequired'),
      type: 'info',
      showCancelButton: true
    }).then((result) => {
      if (result.value) {
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
      } else {
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
