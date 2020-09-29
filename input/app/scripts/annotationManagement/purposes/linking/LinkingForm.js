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
  static showLinkingForm (annotation, formCallback, addingHtml) {
    return new Promise((resolve, reject) => {
      // Close sidebar if opened
      window.abwa.sidebar.closeSidebar()
      let title = 'Creating new relation'
      // Get body for classifying
      let showForm = (preConfirmData) => {
        // Create form
        let form = LinkingForm.generateLinkingFormHTML()
        Alerts.multipleInputAlert({
          title: title || '',
          html: form.html,
          onBeforeOpen: form.onBeforeOpen,
          // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
          callback: form.callback,
          customClass: 'large-swal',
          preConfirm: form.preConfirm
        })
      }
      showForm()
    })
  }

  /**
   * Generates the HTML for comment form based on annotation, add reference autocomplete,...
   * @param annotation
   * @param showForm
   * @param sidebarOpen
   * @param themeOrCode
   * @param previousAssignmentsUI
   * @param formCallback
   * @param addingHtml
   * @returns {{preConfirm: preConfirm, callback: callback, html: (*|string), onBeforeOpen: onBeforeOpen}}
   */
  static generateLinkingFormHTML () {
    let html = ''
    // Create FROM dropdownlist
    let selectFrom = document.createElement('select')
    selectFrom.id = 'categorizeDropdownFrom'
    selectFrom.className = 'linkingConceptInput'
    window.abwa.codebookManager.codebookReader.codebook.themes.forEach(theme => {
      let option = document.createElement('option')
      option.text = theme.name
      option.value = theme.id
      selectFrom.add(option)
    })

    // Create TO dropdownlist
    let selectTo = document.createElement('select')
    selectTo.id = 'categorizeDropdownTo'
    selectFrom.className = 'linkingConceptInput'
    window.abwa.codebookManager.codebookReader.codebook.themes.forEach(theme => {
      if (!theme.isTopic) {
        let option = document.createElement('option')
        option.text = theme.name
        option.value = theme.id
        selectTo.add(option)
      }
    })
    // First row
    html += 'From:' + selectFrom.outerHTML + '<br>'
    // Second row
    html += '<br>Linking word: <input type="text" id="linkingWord"/>'
    const goToLastImageUrl = chrome.extension.getURL('/images/resume.png')
    let lastLinking = document.createElement('img')
    lastLinking.id = 'lastRelationshinpButton'
    lastLinking.src = goToLastImageUrl
    lastLinking.title = 'Get last relationship' // TODO i18n
    html += lastLinking.outerHTML + '<br>'
    // Third row
    html += '<br>To:' + selectTo.outerHTML + '<br>'
    // On before open
    let onBeforeOpen
    onBeforeOpen = () => {
      let retrievedLW
      // Get user selected content
      let selection = document.getSelection()
      // If selection is child of sidebar, return null
      if ($(selection.anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0 || selection.toString().length < 1) {
        retrievedLW = ''
      } else {
        retrievedLW = selection.toString().trim()
      }
      document.querySelector('#linkingWord').value = retrievedLW
      onBeforeOpen.target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
    }
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
        target: onBeforeOpen.target
      })
    }
    let cancelCallback = () => {
      console.log('new link canceled')
    }
    return { html: html, onBeforeOpen: onBeforeOpen, preConfirm: preConfirm, callback: callback, cancelCallback: cancelCallback }
  }
}

export default LinkingForm
