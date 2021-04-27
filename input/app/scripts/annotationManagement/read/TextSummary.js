import Alerts from '../../utils/Alerts'
import PDF from '../../target/formats/PDF'
import FileSaver from 'file-saver'
import {
  Review
} from '../../exporter/reviewModel'
import axios from 'axios'
// PVSCL:IFCOND(ImportChecklist, LINE)
import LanguageUtils from '../../utils/LanguageUtils'
import Events from '../../Events'
import Config from '../../Config'
import { _ } from 'core-js'
import Classifying from '../purposes/Classifying'
// PVSCL:ENDCOND

class TextSummary {

  static proccessReview () {
    // PVSCL:IFCOND(ImportChecklist, LINE)
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

  // PVSCL:IFCOND(ImportChecklist,LINE)
  /**
   * This function generates the dialog to edit, download 
   * and store the review report
   */
  static generateReviewEditor () {
    let report = TextSummary.generateMergedReport()

    let invalidCriticisms = ['I ate dinner.',
      'We had a three-course meal.',
      'Brad came to dinner with us.',
      'He loves fish tacos.',
      'In the end, we all felt like we ate too much.'
    ]

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
        TextSummary.downloadReport(reportText)
      })
      document.querySelector('#saveReportDraft').addEventListener('click', function () {
        let reportText = document.querySelector('#reportText').value
        TextSummary.saveReport(reportText)
        Alerts.successAlert({ text: 'Draft has been successfully saved' })
      })
      let ul = document.getElementById('invalidCriticismsList')
      invalidCriticisms.forEach((invalidCriticism) => {
        var li = document.createElement('li')
        li.appendChild(document.createTextNode(invalidCriticism))
        ul.appendChild(li)
      })

      Alerts.closeAlert()
    })
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
      console.log(searchString)
      let startIndex = oldReportText.indexOf(searchString)
      let endIndex = oldReportText.indexOf('- (Page ', startIndex + searchString.length)
      if (endIndex < 0) {
        endIndex = oldReportText.indexOf('- ""', startIndex + searchString.length)
      }
      if (endIndex < 0) {
        endIndex = oldReportText.indexOf('<Comments to editors>', startIndex + searchString.length)
      }
      const comment = oldReportText.substring(startIndex + searchString.length, endIndex).trim()

      startIndex = newReport.indexOf(searchString)
      endIndex = newReport.indexOf('- (Page ', startIndex + searchString.length)
      if (endIndex < 0) {
        endIndex = newReport.indexOf('- ""', startIndex + searchString.length)
      }
      if (endIndex > 0) {
        newReport = newReport.substring(0, startIndex + searchString.length) + '\n\t' + comment + '\n\t' + newReport.substring(endIndex)
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
