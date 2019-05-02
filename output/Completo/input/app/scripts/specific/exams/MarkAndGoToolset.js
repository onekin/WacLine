const Toolset = require('../../contentScript/Toolset')
const Screenshots = require('./Screenshots')
const BackToWorkspace = require('./BackToWorkspace')
const $ = require('jquery')

class MarkAndGoToolset extends Toolset {
  init () {
    super.init(() => {
      // Change toolset header name
      this.toolsetHeader.innerText = 'Mark&Go'

      // Set screenshot image
      let screenshotImageUrl = chrome.extension.getURL('/images/screenshot.png')
      let toolsetButtonTemplate = document.querySelector('#toolsetButtonTemplate')
      this.screenshotImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.screenshotImage.src = screenshotImageUrl
      this.screenshotImage.title = 'Take a screenshot of the current document' // TODO i18n
      this.toolsetBody.appendChild(this.screenshotImage)
      this.screenshotImage.addEventListener('click', () => {
        this.screenshotButtonHandler()
      })
      // Set back to moodle icon
      let moodleImageUrl = chrome.extension.getURL('/images/moodle.svg')
      this.moodleImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.moodleImage.src = moodleImageUrl
      this.moodleImage.title = 'Back to moodle' // TODO i18n
      BackToWorkspace.createWorkspaceLink().then((link) => {
        this.moodleLink = link
        this.moodleLink.appendChild(this.moodleImage)
        this.toolsetBody.appendChild(this.moodleLink)
      })
    })
  }

  screenshotButtonHandler () {
    Screenshots.takeScreenshot()
  }

  show () {
    super.show()
  }

  hide () {
    super.hide()
  }
}

module.exports = MarkAndGoToolset
