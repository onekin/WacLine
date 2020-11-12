import html2canvas from 'html2canvas'
import FileSaver from 'file-saver'
import JsPDF from 'jspdf'
import Alerts from '../../utils/Alerts'
import _ from 'lodash'
import PDF from '../../target/formats/PDF'

window.html2canvas = html2canvas

class Screenshots {
  static takeScreenshot (callback) {
    let promise = null
    if (window.abwa.targetManager.documentFormat === PDF) {
      // Current viewer status
      const currentScale = window.PDFViewerApplication.pdfViewer.currentScale
      window.PDFViewerApplication.pdfViewer.currentScale = 1
      const currentPage = window.PDFViewerApplication.page
      // Go to first page
      window.PDFViewerApplication.page = 1
      Alerts.confirmAlert({
        alertType: Alerts.alertType.warning,
        title: 'We will create now the PDF.',
        text: 'Please don\'t interact with the document or highlighter',
        callback: () => {
          // Create pdf file
          const pdf = new JsPDF('p', 'cm', 'a4', true)
          // Redraw annotations
          window.abwa.annotationManagement.annotationReader.redrawAnnotations()
          // Append rubric
          const criteriaElement = document.querySelector('#buttonContainer')
          if (criteriaElement) {
            html2canvas(criteriaElement).then((rubric) => {
              const offsetWidth = criteriaElement.offsetWidth
              const offsetHeight = criteriaElement.offsetHeight
              pdf.addImage(rubric.toDataURL(), 'png', 0, 0, 29 * offsetWidth / offsetHeight, 29)
            })
          }
          // Create promises array
          const promisesData = [...Array(window.PDFViewerApplication.pagesCount).keys()].map((index) => { return { i: index } })
          // Page screenshot promise
          const takePDFPageScreenshot = (d) => {
            return new Promise((resolve, reject) => {
              // Go to page
              window.PDFViewerApplication.page = d.i + 1
              // Redraw annotations
              window.abwa.annotationManagement.annotationReader.redrawAnnotations()
              setTimeout(() => {
                html2canvas(document.querySelector('.page[data-page-number="' + (d.i + 1) + '"]'), { scale: 1 }).then((canvas) => {
                  resolve()
                  if (!(d.i === 0 && !_.isElement(criteriaElement))) {
                    pdf.addPage()
                  }
                  pdf.addImage(canvas.toDataURL(), 'png', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), '', 'FAST')
                })
              }, 750)
            })
          }
          // Wait a little bit to draw annotations in first page
          setTimeout(() => {
            // Reduce promise chain
            const promiseChain = promisesData.reduce(
              (chain, d) => chain.then(() => {
                return takePDFPageScreenshot(d)
              }), Promise.resolve([])
            )
            // To execute after promise chain is finished
            promiseChain.then((canvases) => {
              // Restore previous page and zoom
              window.PDFViewerApplication.pdfViewer.currentScale = currentScale
              window.PDFViewerApplication.page = currentPage
              Alerts.infoAlert({
                title: 'PDF is created',
                text: 'You should be prompted to download  the annotated PDF.'
              })
              pdf.save('activity.pdf')
              // Callback
              if (_.isFunction(callback)) {
                callback()
              }
            })
          }, 3000)
        }
      })
    } else {
      let htmlToGenerate = ''
      let cssUrl = chrome.runtime.getURL('styles/contentScript.css')
      fetch(cssUrl)
        .then(result => result.text())
        .then(css => {
          htmlToGenerate += '<html><head><style>' + css + '</style></head>' + document.body.outerHTML
          htmlToGenerate += '<script>\n' +
            'document.querySelector(\'#abwaSidebarButton\').addEventListener(\'click\', () => {\n' +
            '    let sidebarButton = document.querySelector(\'#abwaSidebarButton\')\n' +
            '    sidebarButton.dataset.toggled = sidebarButton.dataset.toggled !== \'true\'\n' +
            '    document.documentElement.dataset.sidebarShown = sidebarButton.dataset.toggled\n' +
            '    document.querySelector(\'#abwaSidebarContainer\').dataset.shown = sidebarButton.dataset.toggled\n' +
            '})\n' +
            '</script>'
          htmlToGenerate += '</html>'
          let a = document.createElement('a')
          a.href = 'data:text/plain;base64,' + btoa(htmlToGenerate)
          a.textContent = 'download'
          a.download = 'activity.html'
          a.click()
        })
    }
  }
}

export default Screenshots
