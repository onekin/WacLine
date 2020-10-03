import _ from 'lodash'
import Alerts from '../../../utils/Alerts'
import LanguageUtils from '../../../utils/LanguageUtils'
import Events from '../../../Events'
import Annotation from '../../Annotation'
import Linking from './Linking'
import LinkingForm from './LinkingForm'

class LinkingManagementForm {

  static showLinkingManagementForm (concept, conceptRelations) {
    return new Promise((resolve, reject) => {
      // Close sidebar if opened
      window.abwa.sidebar.closeSidebar()
      let title = concept.name + ' relations'
      // Get body for classifying
      let showForm = () => {
        // Create form
        let html = LinkingManagementForm.generateLinkingManagementFormHTML(conceptRelations)
        let form = LinkingManagementForm.generateLinkingManagementForm(conceptRelations)
        Alerts.multipleInputAlert({
          title: title || '',
          html: html,
          onBeforeOpen: form.onBeforeOpen,
          customClass: 'large-swal',
          confirmButtonText: 'OK',
          showCancelButton: false
        })
      }
      showForm()
    })
  }

  // Generate linking form HTML
  static generateLinkingManagementFormHTML (conceptRelations) {

    let html = ''

    // CREATE HEADER
    let relationDivHeader = document.createElement('div')
    relationDivHeader.className = 'relationDivHeader'
    relationDivHeader.id = 'divSpanHeader'

    let fromSpanHeader = document.createElement('span')
    fromSpanHeader.className = 'relationFromPartSpan relationSpanHeader'
    fromSpanHeader.innerText = 'From'

    let lwSpanHeader = document.createElement('span')
    lwSpanHeader.className = 'relationLinkingWordSpan relationSpanHeader'
    lwSpanHeader.innerText = 'Linking word'

    let toSpanHeader = document.createElement('span')
    toSpanHeader.className = 'relationToSpan relationSpanHeader'
    toSpanHeader.innerText = 'To'

    relationDivHeader.appendChild(fromSpanHeader)
    relationDivHeader.appendChild(lwSpanHeader)
    relationDivHeader.appendChild(toSpanHeader)

    html += relationDivHeader.outerHTML + '<br>'

    // CREATE ROWS

    for (let i = 0; i < conceptRelations.length; i++) {
      let relation = conceptRelations[i]
      let relationDiv = document.createElement('div')
      relationDiv.className = 'relationDiv'
      relationDiv.id = 'div' + relation.id
      let fromSpan = document.createElement('span')
      fromSpan.className = 'relationFromPartSpan'
      fromSpan.innerText = relation.fromConcept.name

      let lwSpan = document.createElement('span')
      lwSpan.className = 'relationLinkingWordSpan'
      lwSpan.innerText = relation.linkingWord

      let toSpan = document.createElement('span')
      toSpan.className = 'relationToSpan'
      toSpan.innerText = relation.toConcept.name

      relationDiv.appendChild(fromSpan)
      relationDiv.appendChild(lwSpan)
      relationDiv.appendChild(toSpan)

      let deleteButton = document.createElement('button')
      deleteButton.title = 'Delete relation'
      deleteButton.innerText = ' Delete '
      deleteButton.id = 'dlt' + relation.id
      deleteButton.className = 'relationFormBtn'
      let editButton = document.createElement('button')
      editButton.title = 'Edit relation'
      editButton.innerText = ' Edit '
      editButton.id = 'edit' + relation.id
      editButton.className = 'relationFormBtn'
      let swapButton = document.createElement('button')
      swapButton.title = 'Swap relation'
      swapButton.innerText = ' Swap '
      swapButton.id = 'swap' + relation.id
      swapButton.className = 'relationFormBtn'

      relationDiv.appendChild(deleteButton)
      relationDiv.appendChild(editButton)
      relationDiv.appendChild(swapButton)
      html += relationDiv.outerHTML + '<br>'
    }
    return html
  }

  // Generates form functionalities
  static generateLinkingManagementForm (conceptRelations) {

    // On before open
    let onBeforeOpen
    onBeforeOpen = () => {
      for (let i = 0; i < conceptRelations.length; i++) {
        let relation = conceptRelations[i]
        let deleteRelation = '#dlt' + relation.id
        let editRelation = '#edit' + relation.id
        let swapRelation = '#swap' + relation.id

        document.querySelector(swapRelation).addEventListener('click', LinkingManagementForm.swapRelationshipButtonEventHandler())
        document.querySelector(editRelation).addEventListener('click', LinkingManagementForm.editRelationshipButtonEventHandler())
        document.querySelector(deleteRelation).addEventListener('click', LinkingManagementForm.deleteRelationshipButtonEventHandler())
      }
    }
    return { onBeforeOpen: onBeforeOpen }
  }

  // Swaps the from and to parts from the relationship
  static swapRelationshipButtonEventHandler () {
    return (event) => {
      let button = event.target
      let id = button.id.toString().replace('swap', '')
      // Retrieve data
      let relation = window.abwa.mapContentManager.findRelationshipById(id)
      let fromTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(relation.fromConcept.id)
      let toTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(relation.toConcept.id)
      let linkingWord = relation.linkingWord
      Alerts.confirmAlert({
        title: 'Swap relationship',
        text: fromTheme.name + ' -> ' + linkingWord + ' -> ' + toTheme.name + ' will be changed to ' + toTheme.name + ' -> ' + linkingWord + ' -> ' + fromTheme.name + '. Do you want to confirm it?',
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        callback: () => {
          let data = []
          data.linkingWord = linkingWord
          data.fromTheme = toTheme
          data.toTheme = fromTheme
          LinkingManagementForm.updateRelationshipAnnotations(relation, data, () => {
            Alerts.simpleSuccessAlert({ text: 'Relationship swapped' })
          })
        },
        cancelCallback: () => {
          // Nothing to do
        }
      })
    }
  }

  static editRelationshipButtonEventHandler () {
    return (event) => {
      let button = event.target
      let relationId = button.id.toString().replace('edit', '')
      LinkingManagementForm.showUpdateLinkForm(relationId)
    }
  }

  static deleteRelationshipButtonEventHandler () {
    return (event) => {
      let button = event.target
      let id = button.id.toString().replace('dlt', '')
      // Retrieve data
      let relation = window.abwa.mapContentManager.findRelationshipById(id)
      let fromTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(relation.fromConcept.id)
      let toTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(relation.toConcept.id)
      let linkingWord = relation.linkingWord
      Alerts.confirmAlert({
        alertType: Alerts.alertType.question,
        title: 'Delete relationship',
        text: 'Do you want to remove the following link?' + '\n' + fromTheme.name + ' -> ' + linkingWord + ' -> ' + toTheme.name,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        callback: () => {
          // Delete all the relationship annotations
          let linksId = _.map(relation.evidenceAnnotations, (annotation) => {
            return annotation.id
          })
          window.abwa.annotationServerManager.client.deleteAnnotations(linksId, (err) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
            } else {
              LanguageUtils.dispatchCustomEvent(Events.annotationsDeleted, { annotations: relation.evidenceAnnotations })
              LanguageUtils.dispatchCustomEvent(Events.linkAnnotationDeleted, { relation: relation })
            }
          })
        }
      })
    }
  }

  static showUpdateLinkForm (relationId) {
    return new Promise(() => {
      // Close sidebar if opened
      window.abwa.sidebar.closeSidebar()
      let title = 'Updating relation'
      // Get body for classifying
      let showForm = () => {
        // Create form
        let html = LinkingForm.generateLinkingFormHTML()
        let form = LinkingManagementForm.generateUpdateLinkForm(relationId)
        Alerts.threeOptionsAlert({
          title: title || '',
          html: html,
          onBeforeOpen: form.onBeforeOpen,
          confirmButtonText: 'Update relationship',
          showDenyButton: false,
          callback: form.callback,
          cancelCallback: form.cancelCallback,
          customClass: 'large-swal',
          preConfirm: form.preConfirm
        })
      }
      showForm()
    })
  }

  static generateUpdateLinkForm (relationId) {
    let relation = window.abwa.mapContentManager.findRelationshipById(relationId)
    let fromTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(relation.fromConcept.id)
    let toTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(relation.toConcept.id)
    let linkingWord = relation.linkingWord
    // On before open
    let onBeforeOpen
    onBeforeOpen = () => {
      document.querySelector('#inputLinkingWord').value = linkingWord
      document.querySelector('#categorizeDropdownFrom').value = fromTheme.id
      document.querySelector('#categorizeDropdownTo').value = toTheme.id
    }
    // Preconfirm
    let preConfirmData = {}
    let preConfirm = () => {
      let from = document.querySelector('#categorizeDropdownFrom').value
      preConfirmData.linkingWord = document.querySelector('#inputLinkingWord').value
      let to = document.querySelector('#categorizeDropdownTo').value
      preConfirmData.fromTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(from)
      preConfirmData.toTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(to)
      if (from === to) {
        const swal = require('sweetalert2')
        swal.showValidationMessage('You have to make the relation between two different concepts.')
      }
    }
    // Callback
    let callback = () => {
      // UPDATE ANNOTATIONS
      LinkingManagementForm.updateRelationshipAnnotations(relation, preConfirmData, () => {
        Alerts.simpleSuccessAlert({ text: 'Relationship updated' })
      })
    }
    let cancelCallback = () => {
      console.log('new link canceled')
    }
    return { onBeforeOpen: onBeforeOpen, preConfirm: preConfirm, callback: callback, cancelCallback: cancelCallback }
  }

  static updateRelationshipAnnotations (relation, data, callback) {
    // Retrieve relationship annotations
    let annotations = _.compact(relation.evidenceAnnotations)
    annotations = annotations.map(annotation => {
      const linkingBody = annotation.getBodyForPurpose(Linking.purpose)
      if (linkingBody) {
        console.log(linkingBody)
        let value = {}
        value.from = data.fromTheme.id
        value.to = data.toTheme.id
        value.linkingWord = data.linkingWord
        linkingBody.value = value
      }
      let tags = ['from' + ':' + data.fromTheme.name]
      tags.push('linkingWord:' + data.linkingWord)
      tags.push('to:' + data.toTheme.name)
      annotation.tags = tags
      return annotation
    })
    console.log(annotations)
    const promises = annotations.forEach((annotation) => {
      return new Promise((resolve, reject) => {
        window.abwa.annotationServerManager.client.updateAnnotation(annotation.id, annotation.serialize(), (err, annotation) => {
          if (err) {
            reject(err)
          } else {
            const deserializedAnnotation = Annotation.deserialize(annotation)
            LanguageUtils.dispatchCustomEvent(Events.annotationCreated, { annotation: deserializedAnnotation })
            LanguageUtils.dispatchCustomEvent(Events.linkAnnotationCreated, { annotation: deserializedAnnotation })
            resolve(annotation)
          }
        })
      })
    })
    Promise.all(promises || []).then(() => {
      LanguageUtils.dispatchCustomEvent(Events.annotationsDeleted, { annotations: relation.evidenceAnnotations })
      LanguageUtils.dispatchCustomEvent(Events.linkAnnotationDeleted, { relation: relation })
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }
}

export default LinkingManagementForm
