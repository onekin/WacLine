const ChromeStorage = require('../utils/ChromeStorage')
const _ = require('lodash')
const NotificationIds = {
  newToVersion: 'mag.newToVersion'
}
const compareVersions = require('compare-versions')

const manifestData = chrome.runtime.getManifest()
const currentVersion = manifestData.version

class VersionManager {
  init (callback) {
    ChromeStorage.getData('version.latest', ChromeStorage.local, (err, previousVersion) => {
      if (err) {
        // Save not to show again first time message
        this.setLatestVersion(callback)
      } else {
        let message = _.find(VersionManager.messages, (message) => {
          return message.version === currentVersion
        })
        if (previousVersion && previousVersion.version) {
          console.debug('Previous version was: ' + previousVersion.version)
          if (compareVersions(currentVersion, previousVersion.version)) {
            if (message) {
              // Create notification
              chrome.notifications.create(NotificationIds.newToVersion + currentVersion, message.notification)
              // Create handler for new version
              chrome.notifications.onButtonClicked.addListener(message.handler)
            }
          }
        } else {
          if (message) {
            // Create notification
            chrome.notifications.create(NotificationIds.newToVersion + currentVersion, message.notification)
            // Create handler for new version
            chrome.notifications.onButtonClicked.addListener(message.handler)
          }
        }
        // Save not to show again first time message
        ChromeStorage.setData('version.latest', {version: currentVersion}, ChromeStorage.local, () => {

        })
      }
    })
  }

  setLatestVersion (callback) {
    ChromeStorage.setData('version.latest', {version: currentVersion}, ChromeStorage.local, () => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  removeLatestVersion (callback) {
    ChromeStorage.setData('version.latest', {}, ChromeStorage.local, () => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }
}

VersionManager.messages = [
  {
    version: '0.1.0',
    notification: {
      type: 'basic',
      title: 'Welcome to new version of Mark&Go: v0.1.0',
      message: 'Mark&Go is updated to a new version which is incompatible with the previous one. Would you like to know more about it?',
      iconUrl: chrome.extension.getURL('images/icon-512.png'),
      buttons: [{title: 'Yes'}]
    },
    handler: (notificationId, buttonIndex) => {
      if (buttonIndex === 0) {
        // Open new tab with the manual of markAndGo
        chrome.tabs.create({ url: 'https://github.com/haritzmedina/MarkAndGo/releases/tag/v0.1.0' })
      }
    }
  }, {
    version: '0.1.5',
    notification: {
      type: 'basic',
      title: 'Mark&Go is updated to the version v0.1.5',
      message: 'Mark&Go is updated to the new version v0.1.5. Would you like to know which ones are the new features and changes?',
      iconUrl: chrome.extension.getURL('images/icon-512.png'),
      buttons: [{title: 'Yes'}]
    },
    handler: (notificationId, buttonIndex) => {
      if (buttonIndex === 0) {
        chrome.tabs.create({url: 'https://github.com/haritzmedina/MarkAndGo/releases/tag/v0.1.5'})
      }
    }
  }, {
    version: '0.1.6',
    notification: {
      type: 'basic',
      title: 'Mark&Go is updated to the version v0.1.6',
      message: 'Mark&Go is updated to the new version v0.1.6. Would you like to know which ones are the new features and changes?',
      iconUrl: chrome.extension.getURL('images/icon-512.png'),
      buttons: [{title: 'Yes'}]
    },
    handler: (notificationId, buttonIndex) => {
      if (buttonIndex === 0) {
        chrome.tabs.create({url: 'https://github.com/haritzmedina/MarkAndGo/releases/tag/v0.1.6'})
      }
    }
  }
]

module.exports = VersionManager
