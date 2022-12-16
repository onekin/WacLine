import Alerts from '../utils/Alerts'
import _ from 'lodash'
import Annotation from '../annotationManagement/Annotation'

class PreviousVersionAnnotationImporter {
  static askUserToSelectAnnotatedResource (callback) {
    // Close sidebar if opened
    window.abwa.sidebar.closeSidebar()
    let title = 'Select the previous version of this source'
    // Get body for classifying
    let showForm = () => {
      // Create form
      let html = PreviousVersionAnnotationImporter.generateFormHTML()
      let form = PreviousVersionAnnotationImporter.generateForm()
      Alerts.multipleInputAlert({
        title: title || '',
        html: html,
        onBeforeOpen: form.onBeforeOpen,
        confirmButtonText: 'Import',
        callback: form.callback,
        customClass: 'large-swal',
        preConfirm: form.preConfirm,
        preDeny: form.preDeny
      })
    }
    showForm()
  }

  static importPreviousVersionAnnotations () {
    PreviousVersionAnnotationImporter.askUserToSelectAnnotatedResource((err, jsonObject) => {
      if (err) {
        Alerts.errorAlert({ text: 'Unable to parse json file. Error:<br/>' + err.message })
      }
    })
  }

  static generateForm () {

    // Preconfirm
    let preConfirmData = {}
    let preConfirm = () => {
      preConfirmData.value = document.querySelector('#categorizeDropdownPreviousResources').value
    }
    // Callback
    let callback = () => {
      console.log(preConfirmData.value)
      let selectedResourceAnnotations = _.filter(window.abwa.annotationManagement.annotationReader.allGroupAnnotations, (annotation) => {
        return annotation.target[0].source.url === preConfirmData.value
      })
      if (selectedResourceAnnotations) {
        let annotationsForNewVersion = []
        let source = window.abwa.targetManager.getDocumentURIs()
        // Get document title
        source.title = window.abwa.targetManager.documentTitle || ''
        // Get UUID for current target
        source.id = window.abwa.targetManager.getDocumentId()
        selectedResourceAnnotations.forEach(annotation => {
          let target = [{}]
          target[0].source = source
          target[0].selector = annotation.target[0].selector
          let annotationToCreate = new Annotation({
            target: target,
            tags: annotation.tags,
            body: annotation.body
          })
          annotationToCreate.serialize()
          // annotationsForNewVersion.push(annotationToCreate)
          window.abwa.annotationServerManager.client.createNewAnnotation(annotationToCreate.serialize(), (err, annotation) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unable to create new group.' })
            } else {
              // Parse annotations and dispatch created codebook
              console.log(annotation)
            }
          })
        })
        console.log(annotationsForNewVersion)
        Alerts.simpleSuccessAlert({ text: 'Saved' })
      }
    }
    return { preConfirm: preConfirm, callback: callback }
  }

  static generateFormHTML () {
    let html = ''

    // Create input
    let inputFrom = document.createElement('select')
    inputFrom.id = 'categorizeDropdownPreviousResources'
    inputFrom.className = 'annotatedResourceInput'
    inputFrom.placeholder = 'Select an annotated resource'
    inputFrom.setAttribute('list', 'resources')

    let annotatedResources = window.abwa.annotationManagement.annotationReader.allGroupAnnotations.map(annotation => annotation.target[0].source.url)
    annotatedResources = _.uniq(annotatedResources).filter(anno => anno !== undefined)
    console.log(annotatedResources)

    // create options

    if (annotatedResources) {
      annotatedResources.forEach(anno => {
        let option = document.createElement('option')
        option.value = anno
        option.text = anno
        inputFrom.add(option)
      })
    }
    // RENDER
    html += inputFrom.outerHTML

    return html
  }
}

export default PreviousVersionAnnotationImporter
