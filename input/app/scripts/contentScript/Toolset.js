const axios = require('axios')
const _ = require('lodash')
// PVSCL:IFCOND(Canvas,LINE)
const Canvas = require('../consumption/Canvas')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Screenshot,LINE)
const Screenshots = require('../consumption/Screenshots')
// PVSCL:ENDCOND
// PVSCL:IFCOND(MoodleConsumer or GSheetConsumer,LINE)
const BackToWorkspace = require('../consumption/BackToWorkspace')
// PVSCL:ENDCOND
const Resume = require('../consumption/Resume')
// PVSCL:IFCOND(TextSummary,LINE)
const TextSummary = require('../consumption/TextSummary')
// PVSCL:ENDCOND
// PVSCL:IFCOND(DeleteGroup,LINE)
const DeleteGroup = require('../groupManipulation/DeleteGroup')
// PVSCL:ENDCOND
const $ = require('jquery')

class Toolset {
  constructor () {
    this.page = chrome.extension.getURL('pages/sidebar/toolset.html')
  }

  init (callback) {
    axios.get(this.page).then((response) => {
      // Get sidebar container
      this.sidebarContainer = document.querySelector('#abwaSidebarContainer')
      // Insert toolset container
      // PVSCL:IFCOND(Manual,LINE)
      let groupSelectorContainer = this.sidebarContainer.querySelector('#groupSelectorContainer')
      groupSelectorContainer.insertAdjacentHTML('afterend', response.data)
      // PVSCL:ELSECOND
      this.sidebarContainer.insertAdjacentHTML('afterbegin', response.data)
      // PVSCL:ENDCOND
      this.toolsetContainer = this.sidebarContainer.querySelector('#toolset')
      this.toolsetHeader = this.toolsetContainer.querySelector('#toolsetHeader')
      this.toolsetBody = this.sidebarContainer.querySelector('#toolsetBody')
      let toolsetButtonTemplate = this.sidebarContainer.querySelector('#toolsetButtonTemplate')
      // PVSCL:IFCOND(Screenshot,LINE)
      // Set screenshot image
      let screenshotImageUrl = chrome.extension.getURL('/images/screenshot.png')
      this.screenshotImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.screenshotImage.src = screenshotImageUrl
      this.screenshotImage.title = 'Take a screenshot of the current document' // TODO i18n
      this.toolsetBody.appendChild(this.screenshotImage)
      this.screenshotImage.addEventListener('click', () => {
        this.screenshotButtonHandler()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(Canvas,LINE)
      // Set Canvas image
      let canvasImageUrl = chrome.extension.getURL('/images/overview.png')
      this.canvasImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.canvasImage.src = canvasImageUrl
      this.canvasImage.title = 'Generate canvas' // TODO i18n
      this.toolsetBody.appendChild(this.canvasImage)
      this.canvasImage.addEventListener('click', () => {
        this.canvasButtonHandler()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(TextSummary,LINE)
      // Set TextSummary image
      let textSummaryImageUrl = chrome.extension.getURL('/images/generator.png')
      this.textSummaryImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.textSummaryImage.src = textSummaryImageUrl
      this.textSummaryImage.title = 'Generate review report' // TODO i18n
      this.toolsetBody.appendChild(this.textSummaryImage)
      this.textSummaryImage.addEventListener('click', () => {
        this.textSummaryButtonHandler()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(DeleteGroup,LINE)
      // Set DeleteGroup image
      let deleteGroupImageUrl = chrome.extension.getURL('/images/deleteAnnotations.png')
      this.deleteGroupImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.deleteGroupImage.src = deleteGroupImageUrl
      this.deleteGroupImage.title = 'Delete all annotations in document' // TODO i18n
      this.toolsetBody.appendChild(this.deleteGroupImage)
      this.deleteGroupImage.addEventListener('click', () => {
        this.deleteGroupButtonHandler()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(MoodleConsumer or GSheetConsumer,LINE)
      // Set BackToWorkspace image
      this.backToWorkspaceImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      // PVSCL:IFCOND(GSheetConsumer,LINE)
      let backToWorkspaceImageUrl = chrome.extension.getURL('/images/add.png')
      this.backToWorkspaceImage.title = 'Go back to GSheet' // TODO i18n
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(MoodleConsumer,LINE)
      let backToWorkspaceImageUrl = chrome.extension.getURL('/images/moodle.svg')
      this.backToWorkspaceImage.title = 'Go back to Moodle' // TODO i18n
      // PVSCL:ENDCOND
      this.backToWorkspaceImage.src = backToWorkspaceImageUrl
      this.toolsetBody.appendChild(this.backToWorkspaceImage)
      this.backToWorkspaceImage.addEventListener('click', () => {
        this.backToWorkspace()
      })
      // PVSCL:ENDCOND
      // Set GoToLast image
      let goToLastImageUrl = chrome.extension.getURL('/images/resume.png')
      this.goToLastImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.goToLastImage.src = goToLastImageUrl
      this.goToLastImage.title = 'Go to last annotation' // TODO i18n
      this.toolsetBody.appendChild(this.goToLastImage)
      this.goToLastImage.addEventListener('click', () => {
        this.goToLastButtonHandler()
      })
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }
  //PVSCL:IFCOND(Screenshot,LINE)
  screenshotButtonHandler () {
    Screenshots.takeScreenshot()
  }
  //PVSCL:ENDCOND
  //PVSCL:IFCOND(Canvas,LINE)
  canvasButtonHandler () {
    Canvas.generateCanvas()
  }
  //PVSCL:ENDCOND
  //PVSCL:IFCOND(TextSummary,LINE)
  textSummaryButtonHandler () {
    TextSummary.generateReview()
  }
  //PVSCL:ENDCOND
  //PVSCL:IFCOND(DeleteGroup,LINE)
  deleteGroupButtonHandler () {
    DeleteGroup.deleteAnnotations()
  }
  //PVSCL:ENDCOND
  //PVSCL:IFCOND(MoodleConsumer or GSheetConsumer,LINE)
  backToWorkspace () {
    BackToWorkspace.goToWorkspace()
  }
  //PVSCL:ENDCOND
  goToLastButtonHandler () {
    Resume.resume()
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

  destroy () {
    this.toolsetContainer.remove()
  }
}

module.exports = Toolset
