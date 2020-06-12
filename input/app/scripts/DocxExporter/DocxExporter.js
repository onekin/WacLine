
import FileSaver from 'file-saver'
import Alerts from '../utils/Alerts'
import FileUtils from '../utils/FileUtils'
import _ from 'lodash'
import axios from 'axios'


class DocxExporter {

  static export (object) {
    /* Alerts.multipleInputAlert({
      title: '',
      html: '<input type="file" id="files">',
      preConfirm: () => { */
    var PizZip = require('pizzip')
    var DocxTemplater = require('docxtemplater')
    const path = chrome.extension.getURL('content/docxExporter/DocxTemplate.docx')

    axios.get(path, { responseType: 'arraybuffer' }).then((response) => {
      let fileTemplate = new Blob([response.data])
      FileUtils.readBinaryFile(fileTemplate, (_err, content) => {
        let zip = new PizZip(content)
        let doc = new DocxTemplater()
        doc.loadZip(zip)
        doc.setData(object)
        doc.render()

        let buf = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

        FileSaver.saveAs(buf, 'output.docx')

      })
    })



    // }
    // })


  }

  static exportAllAnnotationsToDocx () {
    let exporterObject = {}
    let annotationExport = []
    let annotations = []
    let linksExport = []
    // PVSCL:IFCOND(Linking,LINE)
    annotations = window.abwa.annotationManagement.annotationReader.allServerAnnotations
    // PVSCL:ELSECOND
    // annotations = window.abwa.annotationManagement.annotationReader.allAnnotations
    // PVSCL:ENDCOND
    annotations.forEach((a) => {
      a.group = ''
      a.permissions = {}
      a.body.forEach((b) => {
        if (b.purpose && b.purpose === 'commenting') {
          a.comments = { value: b.value }
        }
        if (b.purpose && b.purpose === 'classifying') {
          a.codeortheme = b.value
        }
      })
      let sourceAnnotation = a.target[0].source
      if (annotationExport.some((an) => { return an.sourceAnnotation.url === a.target[0].source.url })) {
        annotationExport.forEach((an) => { if (an.sourceAnnotation.url === a.target[0].source.url) { an.annotations.push(a) } })
      } else {
        annotationExport.push({ sourceAnnotation, annotations: [a] })
      }
    })
    let parser = []
    annotationExport.forEach((exp, index) => {

      exp.annotations.forEach((a, i) => {
        let ind = i + 1
        parser.push({ from: a.id, to: index + '.' + ind })
        linksExport.map((link) => {
          let pars = parser.filter(p => p.from === a.id)[0]
          if (link.a === pars.from) { link.a = pars.to }
          if (link.b === pars.from) { link.b = pars.to }
        })
        a.id = index + '.' + i
        a.annotationlinks.forEach((l) => {
          linksExport.push({ a: a.id, b: l })
        })
      })
    })
    parser.forEach((p) => {
      linksExport.map((link) => { if (link.a === p.from) { link.a = p.to }; if (link.b === p.from) { link.b = p.to } })
    })
    let linksExportsUnique = []
    linksExport.forEach((l) => {
      if (linksExportsUnique.filter((li) => { return li.a === l.b && li.b === l.a }).length < 1) {
        linksExportsUnique.push(l)
      }
    })
    let date = new Date()
    exporterObject = {
      codebook: window.abwa.codebookManager.codebookReader.codebook,
      appName: chrome.runtime.getManifest().name,
      date: date.getMonth() + 1 + '-' + date.getDate() + '-' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes(),
      session: window.abwa.sessionManagement.sessionReader.currentSession.sessionName,
      documents: annotationExport,
      links: linksExportsUnique
    }
    DocxExporter.export(exporterObject)

  }
}

export default DocxExporter

