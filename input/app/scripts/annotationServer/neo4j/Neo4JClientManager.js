import _ from 'lodash'
import AnnotationServerManager from '../AnnotationServerManager'
import Alerts from '../../utils/Alerts'
import Neo4JClient from './Neo4JClient' // TODO Substitute by the real neo4j client
const userLoginCheckIntervalPeriodInSeconds = 5

class Neo4JClientManager extends AnnotationServerManager {
  constructor () {
    super()
    this.annotationServerMetadata = {
      annotationUrl: 'http://neo4j.com/base/',
      groupUrl: 'http://neo4j.com/base/',
      userUrl: 'http://neo4j.com/base/',
      annotationServerUrl: 'http://neo4j.com/base/'
    }
    this.isLoggedInInterval = null
  }

  init (callback) {
    this.reloadClient(callback)
  }

  isLoggedIn (callback) {
    if (_.isFunction(callback)) {
      this.getCredentials((err, credentials) => {
        if (err) {
          callback(err)
        } else {
          // TODO Check if user grant permission to access neo4j account
        //  if (true){ //credentials.endpoint === 'https://onekin.or' && credentials.token === 'aaa' && credentials.user === 'bbb') {
          callback(null, true)
          //          } else {
          //          callback(null, false)
          //      }
        }
      })
    }
  }

  getCredentials (callback) {
    chrome.runtime.sendMessage({ scope: 'neo4j', cmd: 'getCredentials' }, ({ err, credentials }) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(new Error(err))
        }
      } else {
        if (_.isFunction(callback)) {
          callback(null, credentials)
        }
      }
    })
  }

  logIn (callback) {
    if (!this.isLoggedIn()) {
      this.askUserToLogIn((err) => {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      })
    } else {
      callback(null)
    }
  }

  askUserToLogIn (callback) {
    Alerts.confirmAlert({
      title: 'Neo4J login is required.',
      text: 'Please provide the required login configuration for neo4j.',
      callback: () => {
        Alerts.loadingAlert({ text: 'Waiting for neo4j credentials in the login tab.' })
        // Open new tab with configuration
        const neo4jConfigurationWindow = window.open(chrome.extension.getURL('pages/options.html#neo4jConfiguration'))
        // Interval until correctly logged in
        this.isLoggedInInterval = setInterval(() => {
          if (neo4jConfigurationWindow.closed) {
            if (_.isInteger(this.isLoggedInInterval)) {
              clearInterval(this.isLoggedInInterval)
            }
            if (_.isFunction(callback)) {
              callback(new Error('The neo4j login tab was closed'))
            }
          }
          // Check if it is logged in or not
          this.isLoggedIn((err, isLoggedIn) => {
            if (err) {
              if (_.isInteger(this.isLoggedInInterval)) {
                clearInterval(this.isLoggedInInterval)
              }
              if (_.isFunction(callback)) {
                callback(err)
              }
            } else {
              // If it is logged in, callback and remove interval who checks periodically login status
              if (isLoggedIn) {
                Alerts.closeAlert()
                if (_.isInteger(this.isLoggedInInterval)) {
                  clearInterval(this.isLoggedInInterval)
                }
                if (_.isFunction(callback)) {
                  callback(null)
                }
              }
            }
          })
        }, userLoginCheckIntervalPeriodInSeconds * 1000)
      },
      cancelCallback: () => {
        if (_.isFunction(callback)) {
          callback(new Error('User don\'t want to provide login credentials for neo4j'))
        }
      }
    })
  }

  reloadClient (callback) {
    // TODO Instantiate neo4j client with the correct credentials that the user has already provided
    this.getCredentials((err, credentials) => {
      if (err) {
        callback(err)
      } else {
        //        alert ("CREDENTIASL: " + JSON.stringify(credentials.token,null, 4))
        this.client = new Neo4JClient(credentials.user, credentials.token, credentials.endpoint)
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  reloadClientDELETE (callback) {
    // TODO Instantiate neo4j client with the correct credentials that the user has already provided
    this.client = new Neo4JClient()
    if (_.isFunction(callback)) {
      callback()
    }
  }

  destroy (callback) {
    clearInterval(this.isLoggedInInterval)
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

export default Neo4JClientManager
