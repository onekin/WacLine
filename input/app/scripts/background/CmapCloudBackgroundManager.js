import axios from 'axios'
import _ from 'lodash'
import ChromeStorage from '../utils/ChromeStorage'
import $ from 'jquery'

class CmapCloudBackgroundManager {
  init () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'cmapCloud') {
        if (request.cmd === 'getUserUid') {
          if (_.isString(request.data.user && request.data.password)) {
            let user = request.data.user
            let password = request.data.password
            this.getUid(user, password, (err, uid) => {
              if (err) {
                sendResponse({ err: err })
              } else {
                let userData = {}
                userData.user = user
                userData.password = password
                userData.uid = uid
                ChromeStorage.setData('cmapCloudUserData', { userData: userData }, ChromeStorage.sync, (err) => {
                  if (err) {
                    sendResponse({ err: err })
                  } else {
                    sendResponse({ userData: userData })
                  }
                })
              }
            })
          }
        } else if (request.cmd === 'getUserData') {
          ChromeStorage.getData('cmapCloudUserData', ChromeStorage.sync, (err, userData) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ data: userData })
            }
          })
          return true // Async response
        } else if (request.cmd === 'getRootFolderInfo') {
          if (_.isString(request.data.uid)) {
            let uid = request.data.uid
            this.getRootFolderInfo(uid, (err, folderInfo) => {
              if (err) {
                sendResponse({ err: err })
              } else {
                let folderInfoXML = new XMLSerializer().serializeToString(folderInfo)
                sendResponse({ info: folderInfoXML })
              }
            })
          }
        }
        return true // Async response
      }
    })
  }

  getUid (user, password, callback) {
    // Open preferences page
    let settings = {
      url: 'https://cmapcloud.ihmc.us/j_spring_security_check',
      method: 'POST',
      timeout: 0,
      headers: {
        Connection: 'keep-aliv',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        Origin: 'https://cmapcloud.ihmc.us',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        Referer: 'https://cmapcloud.ihmc.us/login.html',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      },
      data: {
        j_username: user,
        j_password: password,
        Submit: ''
      }
    }

    $.ajax(settings).done(function (response) {
      let parser = new window.DOMParser()
      let docPreferences = parser.parseFromString(response, 'text/html')
      let mapRepositoryElement = docPreferences.querySelector('a[href="/cmaps/myCmaps.html"]')
      if (_.isElement(mapRepositoryElement)) {
        // Open managetokens page
        axios.get('https://cmapcloud.ihmc.us/cmaps/myCmaps.html')
          .then((response) => {
            // Retrieve all tokens
            let locateUID = response.data.match(/uid=[\s\S]*?ou=users/)[0]
            let uid = locateUID.toString().replace('uid=', '').replace(',ou=users', '')
            if (uid) {
              callback(null, uid)
            } else {
              callback(new Error('Unable to retrieve UID'))
            }
          })
      } else {
        callback(new Error('Unable to do the login'))
      }
    })
  }

  getRootFolderInfo (uid, callback) {
    let xhr = new XMLHttpRequest()

    xhr.addEventListener('readystatechange', function () {
      if (this.readyState === 4) {
        if (_.isFunction(callback)) {
          callback(null, this.responseXML)
        }
      }
    })

    xhr.open('GET', 'https://cmapscloud.ihmc.us:443/resources/id=uid=' + uid + ',ou=users,dc=cmapcloud,dc=ihmc,dc=us?cmd=get.compact.resmeta.list')

    xhr.send()
  }
}

export default CmapCloudBackgroundManager
