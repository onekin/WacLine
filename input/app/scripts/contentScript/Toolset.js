const axios = require('axios')
const _ = require('lodash')

class Toolset {
  constructor () {
    this.page = chrome.extension.getURL('pages/sidebar/toolset.html')
  }

  init (callback) {
    axios.get(this.page).then((response) => {
      // Insert toolset container
      this.sidebarContainer = document.querySelector('#abwaSidebarContainer')
      this.sidebarContainer.insertAdjacentHTML('afterbegin', response.data)
      this.toolsetContainer = this.sidebarContainer.querySelector('#toolset')
      this.toolsetHeader = this.toolsetContainer.querySelector('#toolsetHeader')
      this.toolsetBody = this.sidebarContainer.querySelector('#toolsetBody')
	  let toolsetButtonTemplate = this.sidebarContainer.querySelector('#toolsetButtonTemplate')
      // Set screenshot image
      let screenshotImageUrl = chrome.extension.getURL('/images/screenshot.png')
      this.screenshotImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.screenshotImage.src = screenshotImageUrl
      this.screenshotImage.title = 'Take a screenshot of the current document' // TODO i18n
      this.toolsetBody.appendChild(this.screenshotImage)
      this.screenshotImage.addEventListener('click', () => {
        this.screenshotButtonHandler()
      })
	  // Set Canvas image
      let canvasImageUrl = chrome.extension.getURL('/images/overview.png')
      this.canvasImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.canvasImage.src = canvasImageUrl
      this.canvasImage.title = 'Take a screenshot of the current document' // TODO i18n
      this.toolsetBody.appendChild(this.canvasImage)
      this.canvasImage.addEventListener('click', () => {
        this.canvasButtonHandler()
      })
	  // Set TextSummary image
      let textSummaryImageUrl = chrome.extension.getURL('/images/generator.png')
      this.textSummaryImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.textSummaryImage.src = textSummaryImageUrl
      this.textSummaryImage.title = 'Take a screenshot of the current document' // TODO i18n
      this.toolsetBody.appendChild(this.textSummaryImage)
      this.textSummaryImage.addEventListener('click', () => {
        this.textSummaryButtonHandler()
      })
	  // Set DeleteGroup image
      let deleteGroupImageUrl = chrome.extension.getURL('/images/deleteAnnotations.png')
      this.deleteGroupImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.deleteGroupImage.src = deleteGroupImageUrl
      this.deleteGroupImage.title = 'Take a screenshot of the current document' // TODO i18n
      this.toolsetBody.appendChild(this.deleteGroupImage)
      this.deleteGroupImage.addEventListener('click', () => {
        this.deleteGroupButtonHandler()
      })
	  // Set BackToMoodle image
      let backToMoodleImageUrl = chrome.extension.getURL('/images/moodle.svg')
      this.backToMoodleImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.backToMoodleImage.src = backToMoodleImageUrl
      this.backToMoodleImage.title = 'Take a screenshot of the current document' // TODO i18n
      this.toolsetBody.appendChild(this.backToMoodleImage)
      this.backToMoodleImage.addEventListener('click', () => {
        this.backToMoodleButtonHandler()
      })
	  // Set BackToGSheet image
      let backToGSheetImageUrl = chrome.extension.getURL('/images/screenshot.png')
      this.backToGSheetImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.backToGSheetImage.src = backToGSheetImageUrl
      this.backToGSheetImage.title = 'Take a screenshot of the current document' // TODO i18n
      this.toolsetBody.appendChild(this.backToGSheetImage)
      this.backToGSheetImage.addEventListener('click', () => {
        this.backToGSheetButtonHandler()
      })
	  // Set GoToLast image
      let goToLastImageUrl = chrome.extension.getURL('/images/resume.png')
      this.goToLastImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.goToLastImage.src = goToLastImageUrl
      this.goToLastImage.title = 'Take a screenshot of the current document' // TODO i18n
      this.toolsetBody.appendChild(this.goToLastImage)
      this.goToLastImage.addEventListener('click', () => {
        this.goToLastButtonHandler()
      })
	  if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  /**
   * Show toolset in sidebar
   */
  show () {
    // Toolset aria-hidden is false
    this.toolsetContainer.setAttribute('aria-hidden', 'false')
  }

  /**
   * Hide toolset in sidebar
   */
  hide () {
    // Toolset aria-hidden is true
    this.toolsetContainer.setAttribute('aria-hidden', 'true')
  }
}

module.exports = Toolset
