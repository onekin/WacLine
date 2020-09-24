// const _ = require('lodash')
const $ = require('jquery')
const Alerts = require('../../utils/Alerts')
const LanguageUtils = require('../../utils/LanguageUtils')
const Events = require('../../Events')
// const $ = require('jquery')

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
        target: onBeforeOpen.target/* PVSCL:IFCOND(EvidenceAnnotations) */,
        addToCXL: true /* PVSCL:ENDCOND */
      })
    }
    let cancelCallback = () => {
      console.log('new link canceled')
    }
    return {html: html, onBeforeOpen: onBeforeOpen, preConfirm: preConfirm, callback: callback, cancelCallback: cancelCallback}
  }
}

module.exports = LinkingForm
