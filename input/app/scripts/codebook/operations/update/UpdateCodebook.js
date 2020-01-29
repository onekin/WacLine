const Events = require('../../../Events')
const Alerts = require('../../../utils/Alerts')
const _ = require('lodash')
const Theme = require('../../model/Theme')
// PVSCL:IFCOND(Hierarchy,LINE)
const Code = require('../../model/Code')
// PVSCL:ENDCOND
const LanguageUtils = require('../../../utils/LanguageUtils')

class UpdateCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for updateCodebook event
    this.initCreateThemeEvent()
    this.initRemoveThemeEvent()
    // PVSCL:IFCOND(Hierarchy,LINE)
    this.initCreateCodeEvent()
    this.initRemoveCodeEvent()
    // PVSCL:ENDCOND
  }

  // EVENTS
  initCreateThemeEvent () {
    this.events.createThemeEvent = {element: document, event: Events.createTheme, handler: this.createNewThemeEventHandler()}
    this.events.createThemeEvent.element.addEventListener(this.events.createThemeEvent.event, this.events.createThemeEvent.handler, false)
  }

  initRemoveThemeEvent (callback) {
    this.events.removeThemeEvent = {element: document, event: Events.removeTheme, handler: this.removeThemeEventHandler()}
    this.events.removeThemeEvent.element.addEventListener(this.events.removeThemeEvent.event, this.events.removeThemeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }
  // PVSCL:IFCOND(Hierarchy,LINE)

  initCreateCodeEvent (callback) {
    this.events.createCodeEvent = {element: document, event: Events.createCode, handler: this.createCodeEventHandler()}
    this.events.createCodeEvent.element.addEventListener(this.events.createCodeEvent.event, this.events.createCodeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initRemoveCodeEvent (callback) {
    this.events.removeCodeEvent = {element: document, event: Events.removeCode, handler: this.removeCodeEventHandler()}
    this.events.removeCodeEvent.element.addEventListener(this.events.removeCodeEvent.event, this.events.removeCodeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }
  // PVSCL:ENDCOND

  /**
   * This function adds a button in the sidebar that allows to create new themes.
   */
  static createNewThemeButton () {
    let newThemeButton = document.createElement('button')
    newThemeButton.innerText = 'Create new theme'
    newThemeButton.id = 'newThemeButton'
    newThemeButton.className = 'tagButton codingElement'
    newThemeButton.addEventListener('click', () => {
      let newTheme
      Alerts.multipleInputAlert({
        title: 'You are creating a new code for theme: ',
        html: '<input id="themeName" class="formCodeName" type="text" placeholder="New theme name" value=""/>' +
          '<textarea id="themeDescription" class="formCodeDescription" placeholder="Please type a description that describes this theme..."></textarea>',
        preConfirm: () => {
          let themeNameElement = document.querySelector('#themeName')
          let themeName
          if (_.isElement(themeNameElement)) {
            themeName = themeNameElement.value
          }
          let themeDescriptionElement = document.querySelector('#themeDescription')
          let themeDescription
          if (_.isElement(themeDescriptionElement)) {
            themeDescription = themeDescriptionElement.value
          }
          newTheme = new Theme({name: themeName, description: themeDescription, annotationGuide: window.abwa.codebookManager.codebookReader.codebook})
        },
        callback: () => {
          LanguageUtils.dispatchCustomEvent(Events.createTheme, {theme: newTheme})
        }
      })
    })
    window.abwa.codebookManager.codebookReader.buttonContainer.append(newThemeButton)
  }

  /**
   * This function creates a new theme when it receives the createTheme event.
   */
  createNewThemeEventHandler () {
    return (event) => {
      let newThemeAnnotation = event.detail.theme.toAnnotation()
      window.abwa.annotationServerManager.client.createNewAnnotation(newThemeAnnotation, (err, annotation) => {
        if (err) {
          Alerts.errorAlert({text: 'Unable to create the new code. Error: ' + err.toString()})
        } else {
          LanguageUtils.dispatchCustomEvent(Events.themeCreated, {newThemeAnnotation: annotation})
        }
      })
    }
  }

  /**
   * This function removes a new theme when it receives the removeTheme event.
   * @param
   */
  removeThemeEventHandler () {
    return (event) => {
      let theme = event.detail.theme
      // Ask user is sure to remove
      Alerts.confirmAlert({
        title: 'Removing code ' + theme.name,
        text: 'Are you sure that you want to remove the theme ' + theme.name + '. All dependant codes will be deleted too. You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          let annotationsToDelete = [theme.id]
          // Get theme codes id to be removed too
          let codesId = _.map(theme.codes, (code) => { return code.id })
          if (_.every(codesId, _.isString)) {
            annotationsToDelete = annotationsToDelete.concat(codesId)
          }
          window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
            if (err) {
              Alerts.errorAlert({text: 'Unexpected error when deleting the code.'})
            } else {
              LanguageUtils.dispatchCustomEvent(Events.themeRemoved, {theme: theme})
            }
          })
        }
      })
    }
  }
  // PVSCL:IFCOND(Hierarchy, LINE)

  /**
   * This function creates a new code when it receives the createCode event.
   * @param
   */
  createCodeEventHandler () {
    return (event) => {
      let theme = event.detail.theme
      if (!LanguageUtils.isInstanceOf(theme, Theme)) {
        Alerts.errorAlert({text: 'Unable to create new code, theme is not defined.'})
      } else {
        let newCode // The code that the user is creating
        // Ask user for name and description
        Alerts.multipleInputAlert({
          title: 'You are creating a new code for theme: ',
          html: '<input id="codeName" class="formCodeName" type="text" placeholder="New code name" value=""/>' +
            '<textarea id="codeDescription" class="formCodeDescription" placeholder="Please type a description that describes this code..."></textarea>',
          preConfirm: () => {
            let codeNameElement = document.querySelector('#codeName')
            let codeName
            if (_.isElement(codeNameElement)) {
              codeName = codeNameElement.value
            }
            let codeDescriptionElement = document.querySelector('#codeDescription')
            let codeDescription
            if (_.isElement(codeDescriptionElement)) {
              codeDescription = codeDescriptionElement.value
            }
            newCode = new Code({name: codeName, description: codeDescription, theme: theme})
          },
          callback: () => {
            let newCodeAnnotation = newCode.toAnnotation()
            window.abwa.annotationServerManager.client.createNewAnnotation(newCodeAnnotation, (err, annotation) => {
              if (err) {
                Alerts.errorAlert({text: 'Unable to create the new code. Error: ' + err.toString()})
              } else {
                LanguageUtils.dispatchCustomEvent(Events.codeCreated, {newCodeAnnotation: annotation, theme: theme})
              }
            })
          }
        })
      }
    }
  }

  /**
   * This function removes a code when it receives the removeCode event.
   * @param
   */
  removeCodeEventHandler () {
    return (event) => {
      let code = event.detail.code
      // Ask user is sure to remove
      Alerts.confirmAlert({
        title: 'Removing code ' + code.name,
        text: 'Are you sure that you want to remove the code ' + code.name + '. You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          window.abwa.annotationServerManager.client.deleteAnnotation(code.id, (err, result) => {
            if (err) {
              Alerts.errorAlert({text: 'Unexpected error when deleting the code.'})
            } else {
              LanguageUtils.dispatchCustomEvent(Events.codeRemoved, {code: code})
            }
          })
        }
      })
    }
  }
  // PVSCL:ENDCOND
}

module.exports = UpdateCodebook
