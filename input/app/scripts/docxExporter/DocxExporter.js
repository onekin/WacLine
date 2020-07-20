import Alerts from '../utils/Alerts'
import FileUtils from '../utils/FileUtils'
import FileSaver from 'file-saver'
import _ from 'lodash'

import LanguageUtils from '../utils/LanguageUtils'
import Theme from '../codebook/model/Theme'

class DocxExporter {

  exportToDocx () {
    Alerts.multipleInputAlert({
      title: 'Select the template to export this codebook',
      html: '<input type="file" id="files" class="swal2-file" style="width: 300px; display: flex;">',
      preConfirm: () => {
        var PizZip = require('pizzip')
        var DocxTemplater = require('docxtemplater')

        FileUtils.readBinaryFile(document.querySelector('#files').files[0], (_err, content) => {
          let zip = new PizZip(content)
          let doc = new DocxTemplater(zip)

          let object = this.exportTFGtoJSON()

          doc.setData(object)

          doc.render()

          let buf = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

          FileSaver.saveAs(buf, 'Output_' + document.querySelector('#files').files[0].name)
        })
      }
    })
  }

  exportTFGtoJSON () {
    // Get content annotator
    let codebook = window.abwa.codebookManager.codebookReader.codebook

    // Create object to be exported
    const formattedCodebook = {
      name: window.abwa.groupSelector.currentGroup.name/* PVSCL:IFCOND(Marking) */,
      grade: codebook.grade/* PVSCL:ENDCOND */,
      directorTheme: [],
      publicTheme: [],
      privateTheme: [],
      isDirectorTheme: false,
      isPublicTheme: false,
      isPrivateTheme: false
    }

    // For each criteria create the object
    codebook.themes.forEach(theme => {
      if (LanguageUtils.isInstanceOf(theme, Theme)) {
        if (theme.publicPrivate) {
          if (theme.codes.length === 0) {
            formattedCodebook.directorTheme.push(theme.toObjects())
            formattedCodebook.isDirectorTheme = true
          } else {
            formattedCodebook.publicTheme.push(theme.toObjects())
            formattedCodebook.isPublicTheme = true
          }
        } else {
          formattedCodebook.privateTheme.push(theme.toObjects())
          formattedCodebook.isPrivateTheme = true
        }

      }
    })
    // Get annotations from tag manager
    let annotations = window.abwa.annotationManagement.annotationReader.allAnnotations.map(a => a.serialize())
    // Remove not necessary information from annotations (group, permissions, user ¿?,...)
    let exportedDocumentAnnotations = _.map(annotations, (annotation) => {
      // Remove group id where annotation was created in
      annotation.group = ''
      // Remove permissions from the created annotation
      annotation.permissions = {}
      return annotation
    })

    exportedDocumentAnnotations.forEach(annotation => {
      // Control for annotations with comment
      if (annotation.body.length > 1) {
        if (annotation.body[1].value.theme.publicPrivate) {
          formattedCodebook.publicTheme.forEach(publicTheme => {
            if (publicTheme.name === annotation.body[1].value.theme.name) {
              publicTheme.annotations.push({ highlight: annotation.target[0].selector[2].exact, comment: annotation.text })
            }
          })
        } else {
          formattedCodebook.privateTheme.forEach(privateTheme => {
            if (privateTheme.name === annotation.body[1].value.theme.name) {
              privateTheme.annotations.push({ highlight: annotation.target[0].selector[2].exact, comment: annotation.text })
            }
          })
        }
      } else {
        if (annotation.body[0].value.theme.publicPrivate) {
          formattedCodebook.publicTheme.forEach(publicTheme => {
            if (publicTheme.name === annotation.body[0].value.theme.name) {
              publicTheme.annotations.push({ highlight: annotation.target[0].selector[2].exact, comment: '' })
            }
          })
        } else {
          formattedCodebook.privateTheme.forEach(privateTheme => {
            if (privateTheme.name === annotation.body[0].value.theme.name) {
              privateTheme.annotations.push({ highlight: annotation.target[0].selector[2].exact, comment: '' })
            }
          })
        }
      }
    })

    return formattedCodebook
  }
}

export default DocxExporter
