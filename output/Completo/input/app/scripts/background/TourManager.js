const ChromeStorage = require('../utils/ChromeStorage')
const _ = require('lodash')
const NotificationIds = {
  tour: 'mag.tour'
}

class TourManager {
  init (callback) {
    ChromeStorage.getData('tour', ChromeStorage.local, (err, tour) => {
      if (err) {

      } else {
        if (_.isObject(tour) && tour.firstTime === true) {
          // Nothing to do
          if (_.isFunction(callback)) {
            callback(null, false)
          }
        } else {
          // Show first time message
          chrome.notifications.create(NotificationIds.tour, {
            type: 'basic',
            title: 'Welcome to Mark&Go',
            message: 'It is your first time using Mark&Go, would you like to learn how to use it?',
            iconUrl: chrome.extension.getURL('images/icon-512.png'),
            buttons: [
              {title: 'Yes'}]
          }, () => {

          })
          // Save not to show again first time message
          ChromeStorage.setData('tour', {firstTime: true}, ChromeStorage.local, () => {
            if (_.isFunction(callback)) {
              callback(null, true)
            }
          })
        }
      }
    })

    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (notificationId === NotificationIds.tour && buttonIndex === 0) {
        // Open new tab with the manual of markAndGo
        chrome.tabs.create({ url: 'https://github.com/haritzmedina/markAndGo/wiki' })
      }
    })
  }
}

module.exports = TourManager
