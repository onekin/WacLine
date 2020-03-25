import Alerts from '../../utils/Alerts'
import PDF from '../../target/formats/PDF'
import FileSaver from 'file-saver'
import { Review } from '../../exporter/reviewModel'

class TextSummary {
  static generateReview () {
    Alerts.loadingAlert({ text: chrome.i18n.getMessage('GeneratingReviewReport') })
    const review = Review.parseAnnotations(window.abwa.annotationManagement.annotationReader.allAnnotations)
    const report = review.toString()
    const blob = new window.Blob([report], { type: 'text/plain;charset=utf-8' })
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
    Alerts.closeAlert()
  }
}

export default TextSummary
