const _ = require('lodash')
const GoogleSheetClient = require('./GoogleSheetClient')
const Alerts = require('../utils/Alerts')

const reloadIntervalInSeconds = 10 // Reload the google sheet client every 10 seconds

class GoogleSheetsClientManager {
  constructor () {
    this.googleSheetClient = null
  }

  init (callback) {
    this.loadGSheetClient(() => {
      // Start reloading of client
      this.reloadInterval = setInterval(() => {
        this.reloadGSheetClient()
      }, reloadIntervalInSeconds * 1000)
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  loadGSheetClient (callback) {
    this.logInGoogleSheets((err, token) => {
      if (err) {
        this.googleSheetClient = null
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        this.googleSheetClient = new GoogleSheetClient(token)
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    })
  }

  reloadGSheetClient () {
    this.logInSilentGoogleSheets((err, token) => {
      if (err) {
        this.googleSheetClient = null
      } else {
        this.googleSheetClient = new GoogleSheetClient(token)
      }
    })
  }

  logInSilentGoogleSheets (callback) {
    // Promise if user has not given permissions in google sheets
    chrome.runtime.sendMessage({scope: 'googleSheets', cmd: 'getTokenSilent'}, (result) => {
      if (result.token) {
        if (_.isFunction(callback)) {
          callback(null, result.token)
        }
      }
    })
  }

  /**
   * Login in google sheets and ask user if not logged in
   * @param callback - The callback for the response to log in google sheets
   */
  logInGoogleSheets (callback) {
    // Promise if user has not given permissions in google sheets
    chrome.runtime.sendMessage({scope: 'googleSheets', cmd: 'getTokenSilent'}, (result) => {
      if (result.token) {
        if (_.isFunction(callback)) {
          callback(null, result.token)
        }
      } else {
        this.askUserToLogInGoogleSheets((err, token) => {
          if (err) {
            callback(err)
          } else {
            callback(null, token)
          }
        })
      }
    })
  }

  /**
   * Ask user to log in google sheets
   * @param callback
   */
  askUserToLogInGoogleSheets (callback) {
    Alerts.confirmAlert({
      title: 'Google sheets login required',
      text: chrome.i18n.getMessage('GoogleSheetLoginRequired'),
      callback: (err, result) => {
        if (err) {
          callback(new Error('Unable to create message to ask for login'))
        } else {
          if (result) {
            chrome.runtime.sendMessage({scope: 'googleSheets', cmd: 'getToken'}, (result) => {
              if (result.error) {
                if (_.isFunction(callback)) {
                  callback(result.error)
                }
              } else {
                if (_.isFunction(callback)) {
                  callback(null, result.token)
                }
              }
            })
          } else {
            callback(new Error('User don\'t want to log in google sheets'))
          }
        }
      }
    })
  }
}

module.exports = GoogleSheetsClientManager
