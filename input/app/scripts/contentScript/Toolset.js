const axios = require('axios')
const _ = require('lodash')
// PVSCL:IFCOND(Canvas, LINE)
const Canvas = require('../annotationManagement/read/Canvas')
// PVSCL:ENDCOND
// PVSCL:IFCOND(AnnotatedPDF, LINE)
const Screenshots = require('../annotationManagement/read/Screenshots')
// PVSCL:ENDCOND
// PVSCL:IFCOND(GoogleSheetConsumer, LINE)
const GoogleSheetGenerator = require('../annotationManagement/read/GoogleSheetGenerator')
// PVSCL:ENDCOND
// PVSCL:IFCOND(LastAnnotation, LINE)
const Resume = require('../annotationManagement/read/Resume')
// PVSCL:ENDCOND
// PVSCL:IFCOND(TextSummary, LINE)
const TextSummary = require('../annotationManagement/read/TextSummary')
// PVSCL:ENDCOND
const Events = require('../Events')
const LanguageUtils = require('../utils/LanguageUtils')
const Alerts = require('../utils/Alerts')
// PVSCL:IFCOND(MoodleReport, LINE)
const BackToWorkspace = require('../moodle/BackToWorkspace')
// PVSCL:ENDCOND
// PVSCL:IFCOND(AnnotationList, LINE)
const AnnotationList = require('../annotationManagement/read/AnnotationList')
// PVSCL:ENDCOND
// PVSCL:IFCOND(ImportAnnotations, LINE)
const AnnotationImporter = require('../importExport/AnnotationImporter')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Export, LINE)
const AnnotationExporter = require('../importExport/AnnotationExporter')
// PVSCL:ENDCOND
const $ = require('jquery')

class Toolset {
  constructor () {
    this.page = chrome.extension.getURL('pages/sidebar/toolset.html')
  }

  init (callback) {
    console.debug('Initializing toolset')
    axios.get(this.page).then((response) => {
      // Get sidebar container
      this.sidebarContainer = document.querySelector('#abwaSidebarContainer')
      // Insert toolset container
      // PVSCL:IFCOND(Manual, LINE)
      let groupSelectorContainer = this.sidebarContainer.querySelector('#groupSelectorContainer')
      groupSelectorContainer.insertAdjacentHTML('afterend', response.data)
      // PVSCL:ELSECOND
      this.sidebarContainer.insertAdjacentHTML('afterbegin', response.data)
      // PVSCL:ENDCOND
      this.toolsetContainer = this.sidebarContainer.querySelector('#toolset')
      this.toolsetHeader = this.toolsetContainer.querySelector('#toolsetHeader')
      this.toolsetBody = this.sidebarContainer.querySelector('#toolsetBody')
      let toolsetButtonTemplate = this.sidebarContainer.querySelector('#toolsetButtonTemplate')
      // PVSCL:IFCOND(AnnotatedPDF, LINE)
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
      // PVSCL:IFCOND(Canvas, LINE)
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
      // PVSCL:IFCOND(TextSummary, LINE)
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
      // PVSCL:IFCOND(DeleteAll, LINE)
      // Set DeleteAll image
      let deleteGroupImageUrl = chrome.extension.getURL('/images/deleteAnnotations.png')
      this.deleteGroupImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.deleteGroupImage.src = deleteGroupImageUrl
      this.deleteGroupImage.title = 'Delete all annotations in document' // TODO i18n
      this.toolsetBody.appendChild(this.deleteGroupImage)
      this.deleteGroupImage.addEventListener('click', () => {
        this.deleteAllButtonHandler()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(LastAnnotation, LINE)
      // Set GoToLast image
      let goToLastImageUrl = chrome.extension.getURL('/images/resume.png')
      this.goToLastImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.goToLastImage.src = goToLastImageUrl
      this.goToLastImage.title = 'Go to last annotation' // TODO i18n
      this.toolsetBody.appendChild(this.goToLastImage)
      this.goToLastImage.addEventListener('click', () => {
        this.goToLastButtonHandler()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(GoogleSheetConsumer, LINE)
      // Set Spreadsheet generation image
      let googleSheetImageUrl = chrome.extension.getURL('/images/googleSheet.svg')
      this.googleSheetImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.googleSheetImage.src = googleSheetImageUrl
      this.googleSheetImage.title = 'Go to last annotation' // TODO i18n
      this.toolsetBody.appendChild(this.googleSheetImage)
      this.googleSheetImage.addEventListener('click', () => {
        GoogleSheetGenerator.generate()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(MoodleReport, LINE)
      // Set back to moodle icon
      let moodleImageUrl = chrome.extension.getURL('/images/moodle.svg')
      this.moodleImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.moodleImage.src = moodleImageUrl
      this.moodleImage.title = 'Back to moodle' // TODO i18n
      BackToWorkspace.createWorkspaceLink((link) => {
        this.moodleLink = link
        this.moodleLink.appendChild(this.moodleImage)
        this.toolsetBody.appendChild(this.moodleLink)
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(AnnotationList, LINE)
      // Set annotation list image
      let annotationListImageUrl = chrome.extension.getURL('/images/annotationList.png')
      this.annotationListImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.annotationListImage.src = annotationListImageUrl
      this.annotationListImage.title = 'Go to annotation list' // TODO i18n
      this.toolsetBody.appendChild(this.annotationListImage)
      this.annotationListImage.addEventListener('click', () => {
        AnnotationList.openAnnotationList()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(JSON OR ImportAnnotations, LINE)
      let exportImportImageUrl = chrome.extension.getURL('/images/importExport.png')
      this.exportImportImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.exportImportImage.src = exportImportImageUrl
      this.exportImportImage.id = 'importExportButton'
      this.exportImportImage.title = 'Export or import annotations' // TODO i18n
      this.toolsetBody.appendChild(this.exportImportImage)
      // Add menu when clicking on the button
      this.importExportButtonHandler()
      // PVSCL:ENDCOND
      // Check if exist any element in the tools and show it
      if (!_.isEmpty(this.toolsetBody.innerHTML)) {
        this.show()
      }
      console.debug('Initialized toolset')
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }
  // PVSCL:IFCOND(AnnotatedPDF, LINE)
  screenshotButtonHandler () {
    Screenshots.takeScreenshot()
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Canvas, LINE)
  canvasButtonHandler () {
    Canvas.generateCanvas()
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(TextSummary, LINE)
  textSummaryButtonHandler () {
    TextSummary.generateReview()
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(DeleteAll, LINE)
  deleteAllButtonHandler () {
    Alerts.confirmAlert({
      alertType: Alerts.alertType.question,
      title: chrome.i18n.getMessage('DeleteAllAnnotationsConfirmationTitle'),
      text: chrome.i18n.getMessage('DeleteAllAnnotationsConfirmationMessage'),
      callback: (err, toDelete) => {
        // It is run only when the user confirms the dialog, so delete all the annotations
        if (err) {
          // Nothing to do
        } else {
          // Dispatch delete all annotations event
          LanguageUtils.dispatchCustomEvent(Events.deleteAllAnnotations)
          // TODO Check if it is better to maintain the sidebar opened or not
          window.abwa.sidebar.openSidebar()
        }
      }
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(LastAnnotation, LINE)
  goToLastButtonHandler () {
    Resume.resume()
  }
  // PVSCL:ENDCOND

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
    if (_.isElement(this.toolsetContainer)) {
      this.toolsetContainer.remove()
    }
  }

  // PVSCL:IFCOND(ImportAnnotations or JSON, LINE)
  importExportButtonHandler () {
    // Create context menu for import export
    $.contextMenu({
      selector: '#importExportButton',
      trigger: 'left',
      build: () => {
        // Create items for context menu
        let items = {}
        // PVSCL:IFCOND(ImportAnnotations, LINE)
        items['import'] = {name: 'Import annotations'}
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(JSON, LINE)
        items['export'] = {name: 'Export annotations in JSON'}
        // PVSCL:ENDCOND
        return {
          callback: (key, opt) => {
            // PVSCL:IFCOND(ImportAnnotations, LINE)
            if (key === 'import') {
              AnnotationImporter.importReviewAnnotations()
            }
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(JSON, LINE)
            if (key === 'export') {
              AnnotationExporter.exportCurrentDocumentAnnotations()
            }
            // PVSCL:ENDCOND
          },
          items: items
        }
      }
    })
  }
  // PVSCL:ENDCOND
}

module.exports = Toolset
