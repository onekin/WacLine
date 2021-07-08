import Alerts from '../../utils/Alerts'
import PDF from '../../target/formats/PDF'
import FileSaver from 'file-saver'
import {
  Review
} from '../../exporter/reviewModel'
import axios from 'axios'
// PVSCL:IFCOND(EditSummary, LINE)
import LanguageUtils from '../../utils/LanguageUtils'
import Events from '../../Events'
import Config from '../../Config'
import { _ } from 'core-js'
// PVSCL:IFCOND(ImportChecklist, LINE)
import Classifying from '../purposes/Classifying'
import ImportChecklist from '../../codebook/operations/import/ImportChecklist'
// PVSCL:ENDCOND
// PVSCL:ENDCOND

class TextSummary {

  static proccessReview () {
    // PVSCL:IFCOND(EditSummary, LINE)
    TextSummary.generateReviewEditor()
    // PVSCL:ELSECOND
    Alerts.loadingAlert({
      text: chrome.i18n.getMessage('GeneratingReviewReport')
    })
    let report = TextSummary.generateReview()
    TextSummary.downloadReport(report)
    Alerts.closeAlert()
    // PVSCL:ENDCOND
  }

  static generateReview () {
    const review = Review.parseAnnotations(window.abwa.annotationManagement.annotationReader.allAnnotations)
    const report = review.toString()
    return report
  }

  static downloadReport (report) {
    const blob = new window.Blob([report], {
      type: 'text/plain;charset=utf-8'
    })
    // If document is a PDF, get the title
    let title
    if (window.abwa.targetManager.documentFormat.pdf === PDF) {
      title = window.PDFViewerApplication.baseUrl !== null ? window.PDFViewerApplication.baseUrl.split('/')[window.PDFViewerApplication.baseUrl.split('/').length - 1].replace(/\.pdf/i, '') : ''
    } else {
      title = document.title
    }
    let docTitle = 'Review report'
    if (title !== '') docTitle += ' for ' + title
    FileSaver.saveAs(blob, docTitle + '.txt')
  }

  // PVSCL:IFCOND(EditSummary,LINE)
  /**
   * This function generates the dialog to edit, download
   * and store the review report
   */
  static generateReviewEditor () {
    let report = TextSummary.generateMergedReport()
    // PVSCL:IFCOND(ImportChecklist,LINE)
    const checklists = ImportChecklist.getChecklistsAnnotation().map((checklist) => {
      return checklist.body[0].value
    })
    // PVSCL:ENDCOND
    window.abwa.sidebar.closeSidebar()
    const reviewPageURL = chrome.extension.getURL('pages/specific/reviewEditor.html')
    axios.get(reviewPageURL).then((response) => {
      document.body.insertAdjacentHTML('beforeend', response.data)
      document.querySelector('#abwaSidebarButton').style.display = 'none'
      document.querySelector('#reviewEditorOverlay').addEventListener('click', function () {
        document.querySelector('#reviewEditor').parentNode.removeChild(document.querySelector('#reviewEditor'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })
      document.querySelector('#reviewEditorContainer').addEventListener('click', function (e) {
        e.stopPropagation()
      })
      document.addEventListener('keydown', function (e) {
        if (e.code === 'Escape' && document.querySelector('#reviewEditor') != null) document.querySelector('#reviewEditor').parentNode.removeChild(document.querySelector('#reviewEditor'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })
      document.querySelector('#reviewEditorCloseButton').addEventListener('click', function () {
        document.querySelector('#reviewEditor').parentNode.removeChild(document.querySelector('#reviewEditor'))
        document.querySelector('#abwaSidebarButton').style.display = 'block'
      })

      document.querySelector('#reportText').value = report
      document.querySelector('#downloadReport').addEventListener('click', function () {
        let reportText = document.querySelector('#reportText').value
        let summary = TextSummary.generateChecklistsSummary()
        TextSummary.downloadReport(summary + reportText)
      })
      document.querySelector('#saveReportDraft').addEventListener('click', function () {
        let reportText = document.querySelector('#reportText').value
        TextSummary.saveReport(reportText)
        Alerts.successAlert({
          text: 'Draft has been successfully saved'
        })
      })

      // PVSCL:IFCOND(ImportChecklist,LINE)
      const invalidCritContainer = document.querySelector('#invalidCriticismsContainer')
      const invalidCritTemplate = document.querySelector('#invalidCritTemplate')

      if (checklists[0]) {
        const chosenChecklists = checklists[0].chosenChecklists
        if (chosenChecklists) {
          for (let checklist of chosenChecklists) {
            if (checklist.invalidCriticisms) {
              const invalidCriticisms = checklist.invalidCriticisms
              const invalidCritElement = invalidCritTemplate.content.cloneNode(true)
              let ul = invalidCritElement.querySelector('.invalidCriticismsList')
              invalidCritElement.querySelector('.invalidCriticismsTitle').textContent = checklist.name
              invalidCriticisms.forEach((invalidCriticism) => {
                let li = document.createElement('li')
                li.appendChild(document.createTextNode(invalidCriticism))
                ul.appendChild(li)
              })
              invalidCritContainer.appendChild(invalidCritElement)
            }
          }
        }
      }
      // PVSCL:ENDCOND
      Alerts.closeAlert()
    })
  }



  static generateChecklistsSummary () {
    const checklistAnnotations = ImportChecklist.getChecklistsAnnotation()
    let summary = ''
    if (checklistAnnotations) {
      summary += 'CHECKLIST:\n\n'
      checklistAnnotations.forEach((checklist) => {
        summary += checklist.getBodyForPurpose('checklist').toString() + '\n\n'
      })
    }
    return summary
  }

  /**
   * This function returns the Annotation corresponding to the report draft
   * @returns {Object}
   */
  static getReportAnnotation () {
    const allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
    const reportAnnotations = _.filter(allAnnotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes(Config.namespace + ':' + Config.tags.motivation + ':' + 'report')
      })
    })
    return reportAnnotations[0]
  }

  /**
   * This function returns the text of the report with
   * the most updated comments (Uses the updated
   * annotation comments or ones from the draft)
   * @returns {String}
   */
  static generateMergedReport () {
    let newReport = TextSummary.generateReview()
    const oldReportAnnotation = TextSummary.getReportAnnotation()
    if (!oldReportAnnotation) return newReport
    const oldReportText = oldReportAnnotation.body[0].value
    const allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
    const classifyingAnnotations = allAnnotations.filter((annotation) => {
      const classifyingBody = annotation.body.find(body => body.purpose === Classifying.purpose)
      return classifyingBody !== undefined
    })
    const oldAnnotations = classifyingAnnotations.filter((annotation) => {
      return annotation.modified < oldReportAnnotation.modified
    })
    oldAnnotations.forEach((annotation) => {
      const page = annotation.target[0].selector.find(selector => 'page' in selector).page
      const classifyingBody = annotation.body.find(body => body.purpose === Classifying.purpose)
      const themeOrCode = classifyingBody.value.name
      const exact = annotation.target[0].selector.find(selector => 'exact' in selector).exact
      let searchString = '- [' + themeOrCode + ']: "' + exact + '"'
      if (page) {
        searchString = '- (Page ' + page.toString() + ') ' + searchString
      }
      let startIndex = oldReportText.indexOf(searchString)
      let endIndex = oldReportText.indexOf('- (Page ', startIndex + searchString.length)
      if (endIndex < 0) {
        endIndex = oldReportText.indexOf('- ""', startIndex + searchString.length)
      }
      if (endIndex < 0) {
        endIndex = oldReportText.indexOf('<Comments to editors>', startIndex + searchString.length)
      }
      if (startIndex > 0 && endIndex > 0) {
        const comment = oldReportText.substring(startIndex + searchString.length, endIndex).trim()
        startIndex = newReport.indexOf(searchString)
        endIndex = newReport.indexOf('- (Page ', startIndex + searchString.length)
        if (endIndex < 0) {
          endIndex = newReport.indexOf('- ""', startIndex + searchString.length)
        }
        if (endIndex > 0 && startIndex >= 0) {
          newReport = newReport.substring(0, startIndex + searchString.length) + '\n\t' + comment + '\n\t' + newReport.substring(endIndex)
        }
      }
    })
    return newReport
  }

  /**
   * This function saves the text for the report draft
   * @param {String} report
   */
  static saveReport (report) {
    let reportAnnotation = TextSummary.getReportAnnotation()
    if (reportAnnotation) {
      reportAnnotation.body[0].value = report
      LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, { annotation: reportAnnotation })
    } else {
      const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'report'
      const tags = [motivationTag]
      LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
        purpose: 'report',
        tags: tags,
        report: report
      })
    }
  }
  //PVSCL:ENDCOND
}

export default TextSummary
