const html2canvas = require('html2canvas')
window.html2canvas = require('html2canvas')
const FileSaver = require('file-saver')
const JsPDF = require('jspdf')
const Alerts = require('../../utils/Alerts')
const _ = require('lodash')

class Screenshots {
  static takeScreenshot (callback) {
    let promise = null
    if (window.location.pathname === '/content/pdfjs/web/viewer.html') {
      // Current viewer status
      let currentScale = window.PDFViewerApplication.pdfViewer.currentScale
      window.PDFViewerApplication.pdfViewer.currentScale = 1
      let currentPage = window.PDFViewerApplication.page
      // Go to first page
      window.PDFViewerApplication.page = 1

      Alerts.loadingAlert({
        title: 'Please hold on',
        text: 'We are creating the annotated PDF document (<span></span> of ' + window.PDFViewerApplication.pagesCount + ')',
        timerIntervalHandler: (swal) => {
          swal.getContent().querySelector('span').textContent = window.PDFViewerApplication.page
        }
      })
      // Create pdf file
      let pdf = new JsPDF('p', 'cm', 'a4', true)
      // Redraw annotations
      window.abwa.contentAnnotator.redrawAnnotations()
      // Append rubric
      html2canvas(document.querySelector('#tagsEvidencing')).then((rubric) => {
        let offsetWidth = document.querySelector('#tagsEvidencing').offsetWidth
        let offsetHeight = document.querySelector('#tagsEvidencing').offsetHeight
        pdf.addImage(rubric.toDataURL(), 'png', 0, 0, 29 * offsetWidth / offsetHeight, 29)
      })
      // Create promises array
      let promisesData = [...Array(window.PDFViewerApplication.pagesCount).keys()].map((index) => { return {i: index} })
      // Page screenshot promise
      let takePDFPageScreenshot = (d) => {
        return new Promise((resolve, reject) => {
          // Go to page
          window.PDFViewerApplication.page = d.i + 1
          // Redraw annotations
          window.abwa.contentAnnotator.redrawAnnotations()
          setTimeout(() => {
            html2canvas(document.querySelector('.page[data-page-number="' + (d.i + 1) + '"]'), {scale: 1}).then((canvas) => {
              resolve()
              pdf.addPage()
              pdf.addImage(canvas.toDataURL(), 'png', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), '', 'FAST')
            })
          }, 750)
        })
      }
      // Wait a little bit to draw annotations in first page
      setTimeout(() => {
        // Reduce promise chain
        let promiseChain = promisesData.reduce(
          (chain, d) => chain.then(() => {
            return takePDFPageScreenshot(d)
          }), Promise.resolve([])
        )
        // To execute after promise chain is finished
        promiseChain.then((canvases) => {
          // Restore previous page and zoom
          window.PDFViewerApplication.pdfViewer.currentScale = currentScale
          window.PDFViewerApplication.page = currentPage
          Alerts.closeAlert()
          pdf.save('activity.pdf')
          // Callback
          if (_.isFunction(callback)) {
            callback()
          }
        })
      }, 3000)
    } else {
      promise = new Promise((resolve) => {
        html2canvas(document.body).then((canvas) => {
          resolve(canvas)
        })
      })
    }
    promise.then((canvas) => {
      canvas.toBlob((blob) => {
        FileSaver.saveAs(blob, 'exam.png')
      })
    })
  }
}

module.exports = Screenshots
