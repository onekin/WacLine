import Alerts from '../../utils/Alerts'
import PDF from '../../target/formats/PDF'
import FileSaver from 'file-saver'
import {
  Review
} from '../../exporter/reviewModel'
import axios from 'axios'

class TextSummary {

  static proccessReview () {
    Alerts.loadingAlert({
      text: chrome.i18n.getMessage('GeneratingReviewReport')
    })
    let report = TextSummary.generateReview()
    TextSummary.downloadReport(report)
    Alerts.closeAlert()
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

  static generateReviewEditor () {
    let report = TextSummary.generateReview()
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

      const reviewEditorContainer = document.querySelector('#reviewEditorContainer')
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
      let ul = document.getElementById('invalidCriticismsList')
      invalidCriticisms.forEach((invalidCriticism) => {
        var li = document.createElement('li')
        li.appendChild(document.createTextNode(invalidCriticism))
        ul.appendChild(li)
      })

      Alerts.closeAlert()
    })
  }
}

export default TextSummary
