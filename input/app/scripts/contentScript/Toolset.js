import axios from 'axios'
import _ from 'lodash'
// PVSCL:IFCOND(Canvas, LINE)
import Canvas from '../annotationManagement/read/Canvas'
// PVSCL:ENDCOND
// PVSCL:IFCOND(AnnotatedPDF, LINE)
import Screenshots from '../annotationManagement/read/Screenshots'
// PVSCL:ENDCOND
// PVSCL:IFCOND(GoogleSheetConsumer, LINE)
import GoogleSheetGenerator from '../annotationManagement/read/GoogleSheetGenerator'
// PVSCL:ENDCOND
// PVSCL:IFCOND(LastAnnotation, LINE)
import Resume from '../annotationManagement/read/Resume'
// PVSCL:ENDCOND
// PVSCL:IFCOND(TextSummary, LINE)
import TextSummary from '../annotationManagement/read/TextSummary'
// PVSCL:ENDCOND
import Events from '../Events'
import LanguageUtils from '../utils/LanguageUtils'
import Alerts from '../utils/Alerts'
// PVSCL:IFCOND(MoodleReport, LINE)
import BackToWorkspace from '../moodle/BackToWorkspace'
// PVSCL:ENDCOND
// PVSCL:IFCOND(AnnotationList, LINE)
import AnnotationList from '../annotationManagement/read/AnnotationList'
// PVSCL:ENDCOND
// PVSCL:IFCOND(ImportAnnotations, LINE)
import AnnotationImporter from '../importExport/AnnotationImporter'
// PVSCL:ENDCOND
// PVSCL:IFCOND(Export, LINE)
import AnnotationExporter from '../importExport/AnnotationExporter'
// PVSCL:ENDCOND
// PVSCL:IFCOND(CXLExport, LINE)
import { CXLExporter } from '../importExport/cmap/CXLExporter'
// PVSCL:ENDCOND
// PVSCL:IFCOND(CXLImport, LINE)
import CXLImporter from '../importExport/cmap/CXLImporter'
// PVSCL:ENDCOND
import $ from 'jquery'

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
      const groupSelectorContainer = this.sidebarContainer.querySelector('#groupSelectorContainer')
      groupSelectorContainer.insertAdjacentHTML('beforebegin', response.data)
      // PVSCL:ELSECOND
      this.sidebarContainer.insertAdjacentHTML('afterbegin', response.data)
      // PVSCL:ENDCOND
      this.toolsetContainer = this.sidebarContainer.querySelector('#toolset')
      this.toolsetHeader = this.toolsetContainer.querySelector('#toolsetHeader')
      this.toolsetBody = this.sidebarContainer.querySelector('#toolsetBody')
      const toolsetButtonTemplate = this.sidebarContainer.querySelector('#toolsetButtonTemplate')
      // PVSCL:IFCOND(AnnotatedPDF, LINE)
      // Set screenshot image
      const screenshotImageUrl = chrome.extension.getURL('/images/screenshot.png')
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
      const canvasImageUrl = chrome.extension.getURL('/images/overview.png')
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
      const textSummaryImageUrl = chrome.extension.getURL('/images/generator.png')
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
      const deleteGroupImageUrl = chrome.extension.getURL('/images/deleteAnnotations.png')
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
      const goToLastImageUrl = chrome.extension.getURL('/images/resume.png')
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
      const googleSheetImageUrl = chrome.extension.getURL('/images/googleSheet.svg')
      this.googleSheetImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.googleSheetImage.src = googleSheetImageUrl
      this.googleSheetImage.title = 'Generate a spreadsheet with classified content' // TODO i18n
      this.toolsetBody.appendChild(this.googleSheetImage)
      this.googleSheetImage.addEventListener('click', () => {
        GoogleSheetGenerator.generate()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(MoodleReport, LINE)
      // Set back to moodle icon
      const moodleImageUrl = chrome.extension.getURL('/images/moodle.svg')
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
      const annotationListImageUrl = chrome.extension.getURL('/images/annotationList.png')
      this.annotationListImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.annotationListImage.src = annotationListImageUrl
      this.annotationListImage.title = 'Go to annotation list' // TODO i18n
      this.toolsetBody.appendChild(this.annotationListImage)
      this.annotationListImage.addEventListener('click', () => {
        AnnotationList.openAnnotationList()
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(JSON OR ImportAnnotations, LINE)
      const exportImportImageUrl = chrome.extension.getURL('/images/importExport.png')
      this.exportImportImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.exportImportImage.src = exportImportImageUrl
      this.exportImportImage.id = 'importExportButton'
      this.exportImportImage.title = 'Export or import annotations' // TODO i18n
      this.toolsetBody.appendChild(this.exportImportImage)
      // Add menu when clicking on the button
      this.importExportButtonHandler()
      // PVSCL:ENDCOND
      // Add link to configuration page of the tool
      this.toolsetHeader.querySelector('#appNameBadge').href = chrome.extension.getURL('/pages/options.html')
      // PVSCL:IFCOND(CXLExportArchiveFile OR CXLImport, LINE)
      const cxlArchiveFileImageUrl = chrome.extension.getURL('/images/cxl.png')
      this.cxlArchiveFileImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.cxlArchiveFileImage.src = cxlArchiveFileImageUrl
      this.cxlArchiveFileImage.id = 'cxlArchiveFileButton'
      this.cxlArchiveFileImage.title = 'Export resources to an archive file on the local file system'
      this.toolsetBody.appendChild(this.cxlArchiveFileImage)
      // Add menu when clicking on the button
      this.CXLArchiveFileButtonHandler()
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(CXLExportCmapCloud, LINE)
      const cxlCloudImageUrl = chrome.extension.getURL('/images/cmapCloud.png')
      this.cxlCloudImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.cxlCloudImage.src = cxlCloudImageUrl
      this.cxlCloudImage.id = 'cxlCloudButton'
      this.cxlCloudImage.title = 'Export map to CmapCloud' // TODO i18n
      this.toolsetBody.appendChild(this.cxlCloudImage)
      // Add menu when clicking on the button
      this.CXLCloudButtonHandler()
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(CXLExport or CXLImport, LINE)
      const seroImageUrl = chrome.extension.getURL('/images/sero.png')
      this.seroImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.seroImage.src = seroImageUrl
      this.seroImage.id = 'seroButton'
      this.seroImage.title = 'Work with Sero' // TODO i18n
      this.toolsetBody.appendChild(this.seroImage)
      // Add menu when clicking on the button
      this.seroButtonHandler()
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
        const items = {}
        // PVSCL:IFCOND(ImportAnnotations, LINE)
        items.import = { name: 'Import annotations' }
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(JSON, LINE)
        items.export = { name: 'Export annotations in JSON' }
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
  // PVSCL:IFCOND(CXLExportArchiveFile, LINE)

  CXLArchiveFileButtonHandler () {
    // Create context menu for import export
    $.contextMenu({
      selector: '#cxlArchiveFileButton',
      trigger: 'left',
      build: () => {
        // Create items for context menu
        let items = {}
        // PVSCL:IFCOND(CXLImport, LINE)
        items.import = { name: 'Import CXL' }
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(CXLExport, LINE)
        // PVSCL:IFCOND(EvidenceAnnotations, LINE)
        // PVSCL:IFCOND(ToolEvidenceAnnotations, LINE)
        items.exportWithToolURL = { name: 'Export CXL with ' + 'PVSCL:EVAL(WebAnnotationClient->pv:Attribute('appName'))' + ' URLs' }
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(HypothesisEvidenceAnnotations, LINE)
        items.exportWithHypothesisURL = { name: 'Export CXL with Hypothes.is URLs' }
        // PVSCL:ENDCOND
        // PVSCL:ELSECOND
        items.export = { name: 'Export CXL' }
        // PVSCL:ENDCOND
        // PVSCL:ENDCOND
        return {
          callback: (key, opt) => {
            // PVSCL:IFCOND(CXLImport, LINE)
            if (key === 'import') {
              CXLImporter.importCXLfile()
            }
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(CXLExport, LINE)
            // PVSCL:IFCOND(EvidenceAnnotations, LINE)
            // PVSCL:IFCOND(ToolEvidenceAnnotations, LINE)
            if (key === 'exportWithHypothesisURL') {
              CXLExporter.exportCXLFile('archiveFile', 'hypothesis')
            }
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(HypothesisEvidenceAnnotations, LINE)
            if (key === 'exportWithToolURL') {
              CXLExporter.exportCXLFile('archiveFile', 'tool')
            }
            // PVSCL:ENDCOND
            // PVSCL:ELSECOND
            if (key === 'export') {
              CXLExporter.exportCXLFile('archiveFile')
            }
            // PVSCL:ENDCOND
            // PVSCL:ENDCOND
          },
          items: items
        }
      }
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(CXLExportCmapCloud, LINE)

  CXLCloudButtonHandler () {
    // Create context menu for import export
    $.contextMenu({
      selector: '#cxlCloudButton',
      trigger: 'left',
      build: () => {
        // Create items for context menu
        let items = {}
        // PVSCL:IFCOND(CXLExport, LINE)
        // PVSCL:IFCOND(EvidenceAnnotations, LINE)
        // PVSCL:IFCOND(ToolEvidenceAnnotations, LINE)
        items.exportWithToolURL = { name: 'Export CXL with ' + 'PVSCL:EVAL(WebAnnotationClient->pv:Attribute('appName'))' + ' URLs' }
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(HypothesisEvidenceAnnotations, LINE)
        items.exportWithHypothesisURL = { name: 'Export CXL with Hypothes.is URLs' }
        // PVSCL:ENDCOND
        // PVSCL:ELSECOND
        items.export = { name: 'Export CXL' }
        // PVSCL:ENDCOND
        // PVSCL:ENDCOND
        return {
          callback: (key, opt) => {
            // PVSCL:IFCOND(CXLImport, LINE)
            if (key === 'import') {
              // AnnotationImporter.importReviewAnnotations()
            }
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(CXLExport, LINE)
            chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getUserData' }, (response) => {
              if (response.data) {
                let data = response.data
                if (data.userData.user && data.userData.password && data.userData.uid) {
                  // PVSCL:IFCOND(EvidenceAnnotations, LINE)
                  // PVSCL:IFCOND(ToolEvidenceAnnotations, LINE)
                  if (key === 'exportWithHypothesisURL') {
                    CXLExporter.exportCXLFile('cmapCloud', 'hypothesis', data.userData)
                  }
                  // PVSCL:ENDCOND
                  // PVSCL:IFCOND(HypothesisEvidenceAnnotations, LINE)
                  if (key === 'exportWithToolURL') {
                    CXLExporter.exportCXLFile('cmapCloud', 'tool', data.userData)
                  }
                  // PVSCL:ENDCOND
                  // PVSCL:ELSECOND
                  if (key === 'export') {
                    CXLExporter.exportCXLFile('cmapCloud', data.userData)
                  }
                  // PVSCL:ENDCOND
                  // PVSCL:ENDCOND
                }
              } else {
                let callback = () => {
                  window.open(chrome.extension.getURL('pages/options.html#cmapCloudConfiguration'))
                }
                Alerts.infoAlert({ text: 'Please, provide us your Cmap Cloud login credentials in the configuration page of the Web extension.', title: 'We need your Cmap Cloud credentials', callback: callback() })
              }
            })
          },
          items: items
        }
      }
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(CXLExport or CXLImport, LINE)

  seroButtonHandler () {
    // Create context menu for import export
    $.contextMenu({
      selector: '#seroButton',
      trigger: 'left',
      build: () => {
        // Create items for context menu
        let items = {}
        items.importFromSero = { name: 'Import from Sero' }
        items.exportToSero = { name: 'Export to Sero' }
        return {
          callback: (key, opt) => {
            if (key === 'importFromSero') {
              Alerts.simpleSuccessAlert({ text: 'This feature is work in progress' })
            }
            if (key === 'exportToSero') {
              Alerts.simpleSuccessAlert({ text: 'This feature is work in progress' })
            }
          },
          items: items
        }
      }
    })
  }
  // PVSCL:ENDCOND
}

export default Toolset
