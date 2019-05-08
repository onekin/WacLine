const _ = require('lodash')
const MoodleContentScript = require('./moodle/MoodleContentScript')
const MoodleAugmentation = require('./moodle/augmentation/MoodleAugmentation')

window.addEventListener('load', () => {
  console.debug('Loaded moodle content script')
  // When page is loaded, popup button should be always deactivated
  chrome.runtime.sendMessage({scope: 'extension', cmd: 'deactivatePopup'}, (result) => {
    console.log('Deactivated popup')
  })
  // When popup button is clicked
  chrome.extension.onMessage.addListener((msg, sender, sendResponse) => {
    if (_.isEmpty(window.mag)) {
      if (msg.action === 'initContentScript') {
        window.mag = {}
        window.mag.moodleContentScript = new MoodleContentScript()
        window.mag.moodleContentScript.init(() => {
          // Disable the button of popup
          chrome.runtime.sendMessage({scope: 'extension', cmd: 'deactivatePopup'}, (result) => {
            console.log('Deactivated popup')
          })
          window.mag = null
        })
      }
    }
  })
  // Augmentate moodle to add user id for each file link
  window.moodleAugmentation = new MoodleAugmentation()
  window.moodleAugmentation.init()
})
