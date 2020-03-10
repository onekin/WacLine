import FileSaver from 'file-saver'
import _ from 'lodash'

class AnnotationExporter {
  static exportCurrentDocumentAnnotations () {
    // Get annotations from tag manager and content annotator
    let codebook = window.abwa.codebookManager.codebookReader.codebook.toObjects(window.abwa.groupSelector.currentGroup.name)
    let annotations = window.abwa.annotationManagement.annotationReader.allAnnotations.map(a => a.serialize())
    // Remove not necessary information from annotations (group, permissions, user ¿?,...)
    let exportedDocumentAnnotations = _.map(annotations, (annotation) => {
      // Remove group id where annotation was created in
      annotation.group = ''
      // Remove permissions from the created annotation
      annotation.permissions = {}
      return annotation
    })
    // Create object to be exported
    let object = {
      codebook: codebook,
      documentAnnotations: exportedDocumentAnnotations
    }
    // Stringify JS object
    let stringifyObject = JSON.stringify(object, null, 2)
    // Download the file
    let blob = new window.Blob([stringifyObject], {
      type: 'text/plain;charset=utf-8'
    })
    FileSaver.saveAs(blob, 'AnnotationsForDocument-' + window.abwa.targetManager.documentTitle + '.json') // Add document title
  }
}

export default AnnotationExporter
