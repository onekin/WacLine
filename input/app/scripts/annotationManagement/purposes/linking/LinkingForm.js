// const _ = require('lodash')
import $ from 'jquery'
import Alerts from '../../../utils/Alerts'
import LanguageUtils from '../../../utils/LanguageUtils'
import Events from '../../../Events'

class LinkingForm {
  /**
   *
   * @param annotation annotation that is involved
   * @param formCallback callback to execute after form is closed
   * @param addingHtml
   * @returns {Promise<unknown>}
   */
  static showLinkingForm (previousRelationshipData) {
    return new Promise(() => {
      // Close sidebar if opened
      window.abwa.sidebar.closeSidebar()
      let title = 'Creating new relation'
      // Get body for classifying
      let showForm = () => {
        // Create form
        let html = LinkingForm.generateLinkingFormHTML()
        let form = LinkingForm.generateLinkingForm(previousRelationshipData)
        Alerts.threeOptionsAlert({
          title: title || '',
          html: html,
          onBeforeOpen: form.onBeforeOpen,
          // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
          confirmButtonText: 'Save relationship',
          denyButtonText: 'Save & Create another',
          callback: form.callback,
          denyCallback: form.denyCallback,
          cancelCallback: form.cancelCallback,
          customClass: 'large-swal',
          preConfirm: form.preConfirm,
          preDeny: form.preDeny
        })
      }
      showForm()
    })
  }

  static generateLinkingForm (previousRelationshipData) {

    // On before open
    let onBeforeOpen
    onBeforeOpen = () => {
      if (!previousRelationshipData) {
        let retrievedLW
        // Get user selected content
        let selection = document.getSelection()
        // If selection is child of sidebar, return null
        if ($(selection.anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0 || selection.toString().length < 1) {
          retrievedLW = ''
        } else {
          retrievedLW = selection.toString().trim()
        }
        onBeforeOpen.target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
        document.querySelector('#inputLinkingWord').value = retrievedLW
      } else {
        onBeforeOpen.target = previousRelationshipData.target
        document.querySelector('#inputLinkingWord').value = previousRelationshipData.linkingWord
        document.querySelector('#categorizeDropdownFrom').value = previousRelationshipData.from
        document.querySelector('#categorizeDropdownTo').value = previousRelationshipData.to
      }
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
    // Predeny
    let preDenyData = {}
    let preDeny = () => {
      let from = document.querySelector('#categorizeDropdownFrom').value
      preDenyData.linkingWord = document.querySelector('#inputLinkingWord').value
      let to = document.querySelector('#categorizeDropdownTo').value
      preDenyData.fromTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(from)
      preDenyData.toTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(to)
      if (from === to) {
        const swal = require('sweetalert2')
        swal.showValidationMessage('You have to make the relation between two different concepts.')
        return false
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
        target: onBeforeOpen.target
      })
      Alerts.simpleSuccessAlert({ text: 'Saved' })
    }
    let denyCallback = () => {
      let tags = ['from' + ':' + preDenyData.fromTheme.name]
      tags.push('linkingWord:' + preDenyData.linkingWord)
      tags.push('to:' + preDenyData.toTheme.name)
      LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
        purpose: 'linking',
        tags: tags,
        from: preDenyData.fromTheme.id,
        to: preDenyData.toTheme.id,
        linkingWord: preDenyData.linkingWord,
        target: onBeforeOpen.target
      })
      let returnToLinkingForm = () => {
        LinkingForm.showLinkingForm(relationshipData)
      }
      let relationshipData = {}
      relationshipData.target = onBeforeOpen.target
      relationshipData.from = preDenyData.fromTheme.id
      relationshipData.to = preDenyData.toTheme.id
      relationshipData.linkingWord = preDenyData.linkingWord
      Alerts.simpleSuccessAlert({ text: 'Saved', callback: returnToLinkingForm })
    }
    let cancelCallback = () => {
      console.log('new link canceled')
    }
    return { onBeforeOpen: onBeforeOpen, preConfirm: preConfirm, preDeny: preDeny, callback: callback, denyCallback: denyCallback, cancelCallback: cancelCallback }
  }

  static generateLinkingFormHTML () {
    let html = ''

    // Create row
    let divRow = document.createElement('div')
    divRow.id = 'divFirstRow'
    divRow.id = 'divRow'

    /** FROM **/
    // Create div
    let divFrom = document.createElement('div')
    divFrom.id = 'divFrom'
    divFrom.className = 'rowElement'

    // Create span
    let fromSpan = document.createElement('span')
    fromSpan.className = 'linkingFormLabel'
    fromSpan.textContent = 'From: '

    // Create input
    let inputFrom = document.createElement('select')
    inputFrom.id = 'categorizeDropdownFrom'
    inputFrom.className = 'linkingConceptInput'
    inputFrom.placeholder = 'Select a concept'
    inputFrom.setAttribute('list', 'fromConcepts')

    // let fromConcepts = document.createElement('datalist')
    // fromConcepts.id = 'fromConcepts'

    divFrom.appendChild(fromSpan)
    divFrom.appendChild(inputFrom)

    /** LINKING WORD **/
    // Create div
    let divLinkingWord = document.createElement('div')
    divLinkingWord.id = 'divLinkingWord'
    divLinkingWord.className = 'rowElement'

    // Create span
    let linkingWordSpan = document.createElement('span')
    linkingWordSpan.className = 'linkingFormLabel'
    linkingWordSpan.textContent = ' Linking word: '

    // Create input
    let inputLinkingWord = document.createElement('input')
    inputLinkingWord.id = 'inputLinkingWord'

    divLinkingWord.appendChild(linkingWordSpan)
    divLinkingWord.appendChild(inputLinkingWord)

    /** TO **/
    // Create Div
    let divTo = document.createElement('div')
    divTo.id = 'divTo'
    divTo.className = 'rowElement'

    // Create span
    let toSpan = document.createElement('span')
    toSpan.className = 'linkingFormLabel'
    toSpan.textContent = ' To: '

    // Create input
    let inputTo = document.createElement('select')
    inputTo.id = 'categorizeDropdownTo'
    inputTo.className = 'linkingConceptInput'
    inputTo.placeholder = 'Select a concept'
    // inputTo.setAttribute('list', 'toConcepts')

    // let toConcepts = document.createElement('datalist')
    // toConcepts.id = 'toConcepts'

    divTo.appendChild(toSpan)
    divTo.appendChild(inputTo)

    window.abwa.codebookManager.codebookReader.codebook.themes.forEach(theme => {
      let fromOption = document.createElement('option')
      fromOption.value = theme.id
      fromOption.text = theme.name
      inputFrom.add(fromOption)
      if (!theme.isTopic) {
        let toOption = document.createElement('option')
        toOption.value = theme.id
        toOption.text = theme.name
        inputTo.add(toOption)
      }
    })

    divRow.appendChild(divFrom)
    divRow.appendChild(divLinkingWord)
    divRow.appendChild(divTo)

    // RENDER
    html += divRow.outerHTML

    return html
  }

}

export default LinkingForm
