const axios = require('axios')
const _ = require('lodash')
const ChromeStorage = require('../utils/ChromeStorage')

const MoodleClient = require('../moodle/MoodleClient')
const MoodleFunctions = require('../moodle/MoodleFunctions')

class MoodleBackgroundManager {
  init () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'moodle') {
        if (request.cmd === 'getTokenForEndpoint') {
          if (_.isString(request.data.endpoint)) {
            let endpoint = request.data.endpoint
            this.getTokens(endpoint, (err, tokens) => {
              if (err) {
                sendResponse({err: err})
              } else {
                this.testTokens({endpoint, tokens}, (err, tokens) => {
                  if (err) {
                    sendResponse({err: err})
                  } else {
                    // Return token in response
                    sendResponse({tokens: tokens})
                  }
                })
              }
            })
          }
        } else if (request.cmd === 'setMoodleCustomEndpoint') {
          let endpoint = request.data.endpoint
          ChromeStorage.setData('moodleCustomEndpoint', {data: JSON.stringify(endpoint)}, ChromeStorage.sync, (err, data) => {
            if (err) {
              sendResponse({err: err})
            } else {
              sendResponse({endpoint: endpoint})
            }
          })
        } else if (request.cmd === 'getMoodleCustomEndpoint') {
          ChromeStorage.getData('moodleCustomEndpoint', ChromeStorage.sync, (err, endpoint) => {
            if (err) {
              sendResponse({err: err})
            } else {
              if (endpoint) {
                let parsedEndpoint = JSON.parse(endpoint.data)
                sendResponse({endpoint: parsedEndpoint || ''})
              } else {
                sendResponse({endpoint: ''})
              }
            }
          })
        } else if (request.cmd === 'saveGrantedPermissionMoodle') {
          ChromeStorage.setData('moodlePermission', {saved: true}, ChromeStorage.sync, (err) => {
            if (err) {
              sendResponse({err: err})
            } else {
              sendResponse({saved: true})
            }
          })
        } else if (request.cmd === 'hasGrantedPermissionMoodle') {
          ChromeStorage.getData('moodlePermission', ChromeStorage.sync, (err, consent) => {
            if (err) {
              sendResponse({err: err})
            } else {
              sendResponse({consent: consent})
            }
          })
        } else if (request.cmd === 'isApiSimulationActivated') {
          ChromeStorage.getData('moodleApiSimulation', ChromeStorage.sync, (err, isActivated) => {
            if (err) {
              sendResponse({activated: false})
            } else {
              sendResponse(isActivated || {activated: false})
            }
          })
        } else if (request.cmd === 'setApiSimulationActivation') {
          ChromeStorage.setData('moodleApiSimulation', {activated: request.data.isActivated}, ChromeStorage.sync, (err, response) => {
            if (err) {
              sendResponse({err: err, saved: false})
            } else {
              sendResponse({saved: true})
            }
          })
        } else if (request.cmd === 'isAutoOpenFilesActivated') {
          ChromeStorage.getData('autoOpenFiles', ChromeStorage.sync, (err, isActivated) => {
            if (err) {
              sendResponse({activated: false})
            } else {
              sendResponse(isActivated || {activated: false})
            }
          })
        } else if (request.cmd === 'setAutoOpenFiles') {
          ChromeStorage.setData('autoOpenFiles', {activated: request.data.isActivated}, ChromeStorage.sync, (err, response) => {
            if (err) {
              sendResponse({err: err, saved: false})
            } else {
              sendResponse({saved: true})
            }
          })
        }
      }
    })
  }

  getTokens (endpoint, callback) {
    // Open preferences page
    axios.get(endpoint + 'user/preferences.php')
      .then((response) => {
        let parser = new window.DOMParser()
        let docPreferences = parser.parseFromString(response.data, 'text/html')
        let tokenLinkElement = docPreferences.querySelector('a[href*="managetoken.php"]')
        if (_.isElement(tokenLinkElement)) {
          let manageToken = tokenLinkElement.href
          // Open managetokens page
          axios.get(manageToken)
            .then((response) => {
              // Retrieve all tokens
              let docManageToken = parser.parseFromString(response.data, 'text/html')
              let tokenElements = docManageToken.querySelectorAll('.c0:not([scope="col"])')
              if (!_.isEmpty(tokenElements)) {
                let tokens = _.map(tokenElements, (tokenElement) => {
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

  testTokens ({endpoint, tokens}, callback) {
    if (_.isFunction(callback)) {
      // Test all tokens
      if (_.isString(endpoint) && !_.isEmpty(tokens)) {
        let promises = []
        for (let i = 0; i < tokens.length; i++) {
          let token = tokens[i]
          // Test each service
          let moodleClient = new MoodleClient(endpoint, token)
          let functionsToTest = _.values(MoodleFunctions)
          for (let i = 0; i < functionsToTest.length; i++) {
            let bindFunction = functionsToTest[i].clientFunc.bind(moodleClient)
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
            return {token: key, tests: elem}
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

module.exports = MoodleBackgroundManager
