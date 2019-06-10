const _ = require('lodash')

const HypothesisClient = require('hypothesis-api-client')

const reloadIntervalInSeconds = 10 // Reload the hypothesis client every 10 seconds

class HypothesisClientManager {
  constructor () {
    this.hypothesisClient = null
    this.hypothesisToken = null
    this.reloadInterval = null
  }

  init (callback) {
    this.reloadHypothesisClient(() => {
      // Start reloading of client
      this.reloadInterval = setInterval(() => {
        this.reloadHypothesisClient()
      }, reloadIntervalInSeconds * 1000)
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  reloadHypothesisClient (callback) {
    if (_.has(window.background, 'hypothesisManager')) {
      if (_.isString(window.background.hypothesisManager.token)) {
        if (this.hypothesisToken !== window.background.hypothesisManager.token) {
          this.hypothesisToken = window.background.hypothesisManager.token
          if (this.hypothesisToken) {
            this.hypothesisClient = new HypothesisClient(window.background.hypothesisManager.token)
          } else {
            this.hypothesisClient = new HypothesisClient()
          }
        }
        if (_.isFunction(callback)) {
          callback()
        }
      } else {
        window.background.hypothesisManager.retrieveHypothesisToken((err, token) => {
          if (err) {
            this.hypothesisClient = new HypothesisClient()
            this.hypothesisToken = null
          } else {
            this.hypothesisClient = new HypothesisClient(token)
            this.hypothesisToken = token
          }
        })
      }
    } else {
      chrome.runtime.sendMessage({scope: 'hypothesis', cmd: 'getToken'}, (token) => {
        if (this.hypothesisToken !== token) {
          this.hypothesisToken = token
          if (this.hypothesisToken) {
            this.hypothesisClient = new HypothesisClient(token)
          } else {
            this.hypothesisClient = new HypothesisClient()
          }
        }
        if (_.isFunction(callback)) {
          callback()
        }
      })
    }
  }

  isLoggedIn () {
    return !_.isEmpty(this.hypothesisToken)
  }

  logInHypothesis (callback) {
    // TODO Check if user grant permission to access hypothesis account
    if (!this.isLoggedIn()) {
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

  askUserToLogInHypothesis (callback) {
    let swal = require('sweetalert2')
    // Ask question
    swal({
      title: 'Hypothes.is login required', // TODO i18n
      text: chrome.i18n.getMessage('HypothesisLoginRequired'),
      type: 'info',
      showCancelButton: true
    }).then((result) => {
      if (result.value) {
        // Prompt hypothesis login form
        chrome.runtime.sendMessage({scope: 'hypothesis', cmd: 'userLoginForm'}, (result) => {
          if (result.error) {
            if (_.isFunction(callback)) {
              callback(new Error(result.error))
            }
          } else {
            this.reloadHypothesisClient(() => {
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

module.exports = HypothesisClientManager
