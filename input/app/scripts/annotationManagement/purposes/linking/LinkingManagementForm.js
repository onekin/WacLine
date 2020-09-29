import _ from 'lodash'
import Alerts from '../../../utils/Alerts'
import LanguageUtils from '../../../utils/LanguageUtils'
import Events from '../../../Events'

class LinkingManagementForm {
  static showLinkingManagementForm (concept, conceptRelations, formCallback) {
    return new Promise((resolve, reject) => {
      // Close sidebar if opened
      window.abwa.sidebar.closeSidebar()
      let title = concept.name + ' relations'
      // Get body for classifying
      let showForm = (preConfirmData) => {
        // Create form
        let form = LinkingManagementForm.generateLinkingManagementFormHTML(conceptRelations)
        Alerts.multipleInputAlert({
          title: title || '',
          html: form.html,
          onBeforeOpen: form.onBeforeOpen,
          // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
          callback: form.callback,
          customClass: 'large-swal',
          confirmButtonText: 'OK',
          showCancelButton: false
        })
      }
      showForm()
    })
  }

  /**
   * Generates the HTML for comment form based on annotation, add reference autocomplete,...
   */
  static generateLinkingManagementFormHTML (conceptRelations) {
    let html = ''
    let relationDivHeader = document.createElement('div')
    relationDivHeader.className = 'relationDivHeader'
    relationDivHeader.id = 'divSpanHeader'
    let fromSpanHeader = document.createElement('span')
    fromSpanHeader.className = 'linkFormSpan relationSpanHeader'
    fromSpanHeader.innerText = 'From'

    let lwSpanHeader = document.createElement('span')
    lwSpanHeader.className = 'linkWordSpan relationSpanHeader'
    lwSpanHeader.innerText = 'Linking word'

    let toSpanHeader = document.createElement('span')
    toSpanHeader.className = 'linkToSpan relationSpanHeader'
    toSpanHeader.innerText = 'To'

    relationDivHeader.appendChild(fromSpanHeader)
    relationDivHeader.appendChild(lwSpanHeader)
    relationDivHeader.appendChild(toSpanHeader)
    html += relationDivHeader.outerHTML + '<br>'
    for (let i = 0; i < conceptRelations.length; i++) {
      let relation = conceptRelations[i]
      let relationDiv = document.createElement('div')
      relationDiv.className = 'relationDiv'
      relationDiv.id = 'div' + relation.id
      let fromSpan = document.createElement('span')
      fromSpan.className = 'linkFormSpan'
      fromSpan.innerText = relation.fromConcept.name

      let lwSpan = document.createElement('span')
      lwSpan.className = 'linkWordSpan'
      lwSpan.innerText = relation.linkingWord

      let toSpan = document.createElement('span')
      toSpan.className = 'linkToSpan'
      toSpan.innerText = relation.toConcept.name

      relationDiv.appendChild(fromSpan)
      relationDiv.appendChild(lwSpan)
      relationDiv.appendChild(toSpan)

      let deleteButton = document.createElement('button')
      deleteButton.title = 'Delete relation'
      deleteButton.innerText = 'Delete'
      deleteButton.id = 'dlt' + relation.id
      deleteButton.className = 'dltRelationBtn'
      let editButton = document.createElement('button')
      editButton.title = 'Edit relation'
      editButton.innerText = 'Edit'
      editButton.id = 'edit' + relation.id
      editButton.className = 'editRelationBtn'
      let swapButton = document.createElement('button')
      swapButton.title = 'Swap relation'
      swapButton.innerText = 'Swap'
      swapButton.id = 'swap' + relation.id
      swapButton.className = 'swapRelationBtn'

      relationDiv.appendChild(deleteButton)
      relationDiv.appendChild(editButton)
      relationDiv.appendChild(swapButton)
      html += relationDiv.outerHTML + '<br>'
    }

    // On before open
    let onBeforeOpen
    onBeforeOpen = () => {
      for (let i = 0; i < conceptRelations.length; i++) {
        let relation = conceptRelations[i]
        let deleteRelation = '#dlt' + relation.id
        let editRelation = '#edit' + relation.id
        let swapRelation = '#swap' + relation.id

        document.querySelector(deleteRelation).addEventListener('click', (e) => {
          let button = e.target
          let id = button.id.toString().replace('dlt', '')
          // How many annotations?
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
              window.abwa.annotationServerManager.client.deleteAnnotations(linksId, (err, result) => {
                if (err) {
                  Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
                } else {
                  LanguageUtils.dispatchCustomEvent(Events.annotationsDeleted, { annotations: relation.evidenceAnnotations })
                  LanguageUtils.dispatchCustomEvent(Events.linkAnnotationDeleted, { relation: relation })
                }
              })
            }
          })
        })
        document.querySelector(editRelation).addEventListener('click', (e) => {
          let button = e.target
          let relationId = button.id.toString().replace('edit', '')
          LinkingManagementForm.showUpdateLinkForm(relationId, (err, annotations) => {
            if (err) {
              // Alerts.errorAlert({text: 'Unexpected error when commenting. Please reload webpage and try again. Error: ' + err.message})
            } else {
              /* LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
                annotation: annotation
              }) */
            }
          })
        })
        document.querySelector(swapRelation).addEventListener('click', (e) => {
          let button = e.target
          Alerts.infoAlert({ title: 'Swap ' + button.id })
        })
      }
    }
    // Callback
    let callback = () => {
      // TODO Guardar cambios
    }
    let cancelCallback = () => {
      console.log('new link canceled')
    }
    return { html: html, onBeforeOpen: onBeforeOpen, callback: callback, cancelCallback: cancelCallback }
  }

  static showUpdateLinkForm (relationId, formCallback) {
    return new Promise((resolve, reject) => {
      let title = 'Update relation'
      // Get body for classifying
      let showForm = (preConfirmData) => {
        // Create form
        let formForUpdate = LinkingManagementForm.generateUpdateLinkFormHTML(relationId)
        Alerts.multipleInputAlert({
          title: title || '',
          html: formForUpdate.html,
          onBeforeOpen: formForUpdate.onBeforeOpen,
          // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
          callback: formForUpdate.callback,
          preConfirm: formForUpdate.preConfirm
        })
      }
      showForm()
    })
  }

  static generateUpdateLinkFormHTML (relationId) {
    let html = ''
    let selectFrom = document.createElement('select')
    selectFrom.id = 'categorizeDropdownFrom'
    window.abwa.codebookManager.codebookReader.codebook.themes.forEach(theme => {
      let option = document.createElement('option')
      option.text = theme.name
      option.value = theme.id
      selectFrom.add(option)
    })
    html += 'From:' + selectFrom.outerHTML + '<br>'
    html += '<br>Linking word: <input type="text" id="linkingWord"/><br>'
    let selectTo = document.createElement('select')
    selectTo.id = 'categorizeDropdownTo'
    window.abwa.codebookManager.codebookReader.codebook.themes.forEach(theme => {
      let option = document.createElement('option')
      option.text = theme.name
      option.value = theme.id
      selectTo.add(option)
    })
    html += '<br>To:' + selectTo.outerHTML + '<br>'

    // On before open
    let onBeforeOpen
    onBeforeOpen = () => {
      let relation = window.abwa.mapContentManager.findRelationshipById(relationId)
      document.querySelector('#linkingWord').value = relation.linkingWord
      document.querySelector('#categorizeDropdownFrom').value = relation.fromConcept.id
      document.querySelector('#categorizeDropdownTo').value = relation.toConcept.id
    }
    // Preconfirm
    // Preconfirm
    let preConfirmData = {}
    let preConfirm = () => {
      let from = document.querySelector('#categorizeDropdownFrom').value
      preConfirmData.linkingWord = document.querySelector('#linkingWord').value
      let to = document.querySelector('#categorizeDropdownTo').value
      preConfirmData.fromTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(from)
      preConfirmData.toTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(to)
      if (from === to) {
        const swal = require('sweetalert2')
        swal.showValidationMessage('You have to make the relation between two different concepts.')
      } /* PVSCL:IFCOND(TopicBased) */ else if (preConfirmData.toTheme.isTopic) {
        const swal = require('sweetalert2')
        swal.showValidationMessage('You cannot select the topic concept as to part of the relation.')
      } /* PVSCL:ENDCOND */ else {
        // callback(fromTheme, toTheme, preConfirmData.linkingWord)
      }
    }
    // Callback
    let callback = () => {
      // TODO comprobar que no existe
      let tags = ['from' + ':' + preConfirmData.fromTheme.name]
      tags.push('linkingWord:' + preConfirmData.linkingWord)
      tags.push('to:' + preConfirmData.toTheme.name)
      LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
        purpose: 'linking',
        tags: tags,
        from: preConfirmData.fromTheme.id,
        to: preConfirmData.toTheme.id,
        linkingWord: preConfirmData.linkingWord,
        target: onBeforeOpen.target /* PVSCL:IFCOND(EvidenceAnnotations) */,
        addToCXL: true /* PVSCL:ENDCOND */
      })
    }
    let cancelCallback = () => {
      console.log('new link canceled')
    }
    return { html: html, onBeforeOpen: onBeforeOpen, preConfirm: preConfirm, callback: callback, cancelCallback: cancelCallback }
  }
}

export default LinkingManagementForm
