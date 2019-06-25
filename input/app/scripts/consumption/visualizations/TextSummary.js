const Alerts = require('../../utils/Alerts')
const FileSaver = require('file-saver')
const AnnotationUtils = require('../../utils/AnnotationUtils')

class TextSummary {
  static generateReview () {
    Alerts.loadingAlert({text: chrome.i18n.getMessage('GeneratingReviewReport')})
    let review = AnnotationUtils.parseAnnotations(window.abwa.contentAnnotator.allAnnotations)
    let report = review.toString()
    let blob = new window.Blob([report], {type: 'text/plain;charset=utf-8'})
    let title = window.PDFViewerApplication.baseUrl !== null ? window.PDFViewerApplication.baseUrl.split('/')[window.PDFViewerApplication.baseUrl.split('/').length - 1].replace(/\.pdf/i, '') : ''
    let docTitle = 'Review report'
    if (title !== '') docTitle += ' for ' + title
    FileSaver.saveAs(blob, docTitle + '.txt')
    Alerts.closeAlert()
  }
}

module.exports = TextSummary
