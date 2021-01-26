import axios from 'axios'
import _ from 'lodash'
import ChromeStorage from '../utils/ChromeStorage'
import MoodleClient from '../moodle/MoodleClient'
import MoodleFunctions from '../moodle/MoodleFunctions'

class MoodleBackgroundManager {
  init () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'moodle') {
        if (request.cmd === 'getTokenForEndpoint') {
          if (_.isString(request.data.endpoint)) {
            const endpoint = request.data.endpoint
            this.getTokens(endpoint, (err, tokens) => {
              if (err) {
                sendResponse({ err: err })
              } else {
                this.testTokens({ endpoint, tokens }, (err, tokens) => {
                  if (err) {
                    sendResponse({ err: err })
                  } else {
                    // Return token in response
                    sendResponse({ tokens: tokens })
                  }
                })
              }
            })
          }
        } else if (request.cmd === 'setMoodleCustomEndpoint') {
          const endpoint = request.data.endpoint
          ChromeStorage.setData('moodleCustomEndpoint', { data: JSON.stringify(endpoint) }, ChromeStorage.sync, (err, data) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ endpoint: endpoint })
            }
          })
        } else if (request.cmd === 'getMoodleCustomEndpoint') {
          ChromeStorage.getData('moodleCustomEndpoint', ChromeStorage.sync, (err, endpoint) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (endpoint) {
                const parsedEndpoint = JSON.parse(endpoint.data)
                sendResponse({ endpoint: parsedEndpoint || '' })
              } else {
                sendResponse({ endpoint: '' })
              }
            }
          })
        } else if (request.cmd === 'saveGrantedPermissionMoodle') {
          ChromeStorage.setData('moodlePermission', { saved: true }, ChromeStorage.sync, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ saved: true })
            }
          })
        } else if (request.cmd === 'hasGrantedPermissionMoodle') {
          ChromeStorage.getData('moodlePermission', ChromeStorage.sync, (err, consent) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ consent: consent })
            }
          })
        } else if (request.cmd === 'isApiSimulationActivated') {
          ChromeStorage.getData('moodleApiSimulation', ChromeStorage.sync, (err, isActivated) => {
            if (err) {
              sendResponse({ activated: true })
            } else {
              sendResponse(isActivated || { activated: true })
            }
          })
        } else if (request.cmd === 'setApiSimulationActivation') {
          ChromeStorage.setData('moodleApiSimulation', { activated: request.data.isActivated }, ChromeStorage.sync, (err, response) => {
            if (err) {
              sendResponse({ err: err, saved: false })
            } else {
              sendResponse({ saved: true })
            }
          })
        } else if (request.cmd === 'isAutoOpenFilesActivated') {
          ChromeStorage.getData('autoOpenFiles', ChromeStorage.sync, (err, isActivated) => {
            if (err) {
              sendResponse({ activated: true })
            } else {
              sendResponse(isActivated || { activated: true })
            }
          })
        } else if (request.cmd === 'setAutoOpenFiles') {
          ChromeStorage.setData('autoOpenFiles', { activated: request.data.isActivated }, ChromeStorage.sync, (err, response) => {
            if (err) {
              sendResponse({ err: err, saved: false })
            } else {
              sendResponse({ saved: true })
            }
          })
        } else if (request.cmd === 'isMoodleUpdateNotificationActivated') {
          ChromeStorage.getData('moodleUpdatedNotification', ChromeStorage.sync, (err, isActivated) => {
            if (err) {
              sendResponse({ activated: false })
            } else {
              sendResponse(isActivated || { activated: true })
            }
          })
        } else if (request.cmd === 'setMoodleUpdateNotification') {
          ChromeStorage.setData('moodleUpdatedNotification', { activated: request.data.isActivated }, ChromeStorage.sync, (err, response) => {
            if (err) {
              sendResponse({ err: err, saved: false })
            } else {
              sendResponse({ saved: true })
            }
          })
        } else if (request.cmd === 'isMoodleUploadAnnotatedFilesActivated') {
          ChromeStorage.getData('moodleUploadAnnotatedFiles', ChromeStorage.sync, (err, isActivated) => {
            if (err) {
              sendResponse({ activated: false })
            } else {
              sendResponse(isActivated || { activated: true })
            }
          })
        } else if (request.cmd === 'setMoodleUploadAnnotatedFilesNotification') {
          ChromeStorage.setData('moodleUploadAnnotatedFiles', { activated: request.data.isActivated }, ChromeStorage.sync, (err, response) => {
            if (err) {
              sendResponse({ err: err, saved: false })
            } else {
              sendResponse({ saved: true })
            }
          })
        }
      }
      return true
    })
  }

  getTokens (endpoint, callback) {
    // Open preferences page
    axios.get(endpoint + 'user/preferences.php')
      .then((response) => {
        const parser = new window.DOMParser()
        const docPreferences = parser.parseFromString(response.data, 'text/html')
        const tokenLinkElement = docPreferences.querySelector('a[href*="managetoken.php"]')
        if (_.isElement(tokenLinkElement)) {
          const manageToken = tokenLinkElement.href
          // Open managetokens page
          axios.get(manageToken)
            .then((response) => {
              // Retrieve all tokens
              const docManageToken = parser.parseFromString(response.data, 'text/html')
              const tokenElements = docManageToken.querySelectorAll('.c0:not([scope="col"])')
              if (!_.isEmpty(tokenElements)) {
                const tokens = _.map(tokenElements, (tokenElement) => {
                  console.log(tokenElement.innerText)
                  return tokenElement.innerText
                })
                callback(null, tokens)
              } else {
                callback(new Error('Unable to retrieve tokens from DOM'))
              }
            })
        } else {
          callback(new Error('Unable to open managetoken.php. Are you subscribed to any service?'))
        }
      })
  }

  testTokens ({ endpoint, tokens }, callback) {
    if (_.isFunction(callback)) {
      // Test all tokens
      if (_.isString(endpoint) && !_.isEmpty(tokens)) {
        const promises = []
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i]
          // Test each service
          const moodleClient = new MoodleClient(endpoint, token)
          const functionsToTest = _.values(MoodleFunctions)
          for (let i = 0; i < functionsToTest.length; i++) {
            const bindFunction = functionsToTest[i].clientFunc.bind(moodleClient)
            promises.push(new Promise((resolve) => {
              bindFunction(functionsToTest[i].testParams, (err, result) => {
                resolve({
                  token: token,
                  service: functionsToTest[i].wsFunc,
                  enabled: !(err || result.exception === 'webservice_access_exception')
                })
              })
            }))
          }
        }
        Promise.all(promises).then((resolves) => {
          let tests = _.map(_.groupBy(resolves, 'token'), (elem, key) => {
            return { token: key, tests: elem }
          })
          // Remove tokens with not any of the functions enabled
          tests = _.filter(tests, (test) => { return _.find(test.tests, 'enabled') })
          if (_.isObject(resolves)) {
            callback(null, tests)
          }
        })
      }
    } else {
      console.error('No callback defined')
    }
  }
}

export default MoodleBackgroundManager
