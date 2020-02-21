const Events = require('../../../Events')
const Alerts = require('../../../utils/Alerts')
const _ = require('lodash')
const Config = require('../../../Config')
const Theme = require('../../model/Theme')
const Classifying = require('../../../annotationManagement/purposes/Classifying')
const Annotation = require('../../../annotationManagement/Annotation')
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
    this.initUpdateThemeEvent()
    // PVSCL:IFCOND(Hierarchy,LINE)
    this.initCreateCodeEvent()
    this.initRemoveCodeEvent()
    this.initUpdateCodeEvent()
    // PVSCL:ENDCOND
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  initCreateThemeEvent () {
    this.events.createThemeEvent = {element: document, event: Events.createTheme, handler: this.createNewThemeEventHandler()}
    this.events.createThemeEvent.element.addEventListener(this.events.createThemeEvent.event, this.events.createThemeEvent.handler, false)
  }

  initUpdateThemeEvent () {
    this.events.updateThemeEvent = {element: document, event: Events.updateTheme, handler: this.createUpdateThemeEventHandler()}
    this.events.updateThemeEvent.element.addEventListener(this.events.updateThemeEvent.event, this.events.updateThemeEvent.handler, false)
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

  initUpdateCodeEvent () {
    this.events.updateCodeEvent = {element: document, event: Events.updateCode, handler: this.createUpdateCodeEventHandler()}
    this.events.updateCodeEvent.element.addEventListener(this.events.updateCodeEvent.event, this.events.updateCodeEvent.handler, false)
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
        title: 'You are creating a new theme: ',
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" placeholder="New theme name" value=""/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="themeDescription" placeholder="Please type a description that describes this theme..."></textarea>',
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
   * This function creates a handler to create a new theme when it receives the createTheme event.
   * @return Event
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
   * This function creates a handler to update a new theme when it receives the updateTheme event.
   * @return Event
   */
  createUpdateThemeEventHandler () {
    return (event) => {
      let theme = event.detail.theme
      let themeToUpdate
      // Show form to update theme
      Alerts.multipleInputAlert({
        title: 'You are updating the theme ' + theme.name,
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" type="text" placeholder="New theme name" value="' + theme.name + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6"  id="themeDescription" placeholder="Please type a description that describes this theme...">' + theme.description + '</textarea>',
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
          themeToUpdate = new Theme({name: themeName, description: themeDescription, annotationGuide: window.abwa.codebookManager.codebookReader.codebook})
          // PVSCL:IFCOND(Hierarchy, LINE)
          theme.codes.forEach(code => { code.theme = themeToUpdate })
          themeToUpdate.codes = theme.codes
          // PVSCL:ENDCOND
          themeToUpdate.id = theme.id
        },
        callback: () => {
          // Update codebook
          this.updateCodebookTheme(themeToUpdate)
          // Update all annotations done with this theme
          this.updateAnnotationsWithTheme(themeToUpdate)
        }
      })
    }
  }

  /**
   * This function creates a handler to remove a theme when it receives the removeTheme event.
   * @return Event
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
   * This function creates a handler to create a new code when it receives the createCode event.
   * @return Events
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
          html: '<input autofocus class="formCodeName swal2-input" type="text" id="codeName" type="text" placeholder="Code name" value=""/>' +
            '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="codeDescription" placeholder="Please type a description that describes this code..."></textarea>',
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

  createUpdateCodeEventHandler () {
    return (event) => {
      let code = event.detail.code
      let codeToUpdate
      // Show form to update theme
      Alerts.multipleInputAlert({
        title: 'You are updating the code ' + code.name + 'pertaining to theme' + code.theme.name,
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="codeName" type="text" placeholder="Code name" value="' + code.name + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="codeDescription" placeholder="Please type a description that describes this code...">' + code.description + '</textarea>',
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
          codeToUpdate = new Code({name: codeName, description: codeDescription, theme: code.theme})
          codeToUpdate.id = code.id
        },
        callback: () => {
          // Update codebook
          this.updateCodebookCode(codeToUpdate)
          // Update all annotations done with this theme
          this.updateAnnotationsWithCode(codeToUpdate)
        }
      })
    }
  }

  updateCodebookCode (codeToUpdate, callback) {
    let annotationsToUpdate = codeToUpdate.toAnnotation()
    window.abwa.annotationServerManager.client.updateAnnotation(annotationsToUpdate.id, annotationsToUpdate, (err, annotation) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
        Alerts.errorAlert({text: 'Unable to create the new code. Error: ' + err.toString()})
      } else {
        if (_.isFunction(callback)) {
          callback()
        }
        LanguageUtils.dispatchCustomEvent(Events.codeUpdated, {updatedCode: codeToUpdate})
      }
    })
  }

  updateAnnotationsWithCode () {

  }

  /**
   * This function creates a handler to remove a code when it receives the removeCode event.
   * @return Events
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
  updateCodebookTheme (themeToUpdate, callback) {
    let annotationsToUpdate = themeToUpdate.toAnnotations()
    let updatePromises = annotationsToUpdate.map((annotation) => {
      return new Promise((resolve, reject) => {
        window.abwa.annotationServerManager.client.updateAnnotation(annotation.id, annotation, (err, annotation) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    })
    Promise
      .all(updatePromises)
      .catch((rejects) => {
        Alerts.errorAlert({text: 'Unable to create the new code. Error: ' + rejects[0].toString()})
      }).then(() => {
        if (_.isFunction(callback)) {
          callback()
        }
        LanguageUtils.dispatchCustomEvent(Events.themeUpdated, {updatedTheme: themeToUpdate})
      })
  }

  updateAnnotationsWithTheme (theme) {
    // Get all the annotations done in the group with this theme
    let searchByTagPromise = (tag) => {
      return new Promise((resolve, reject) => {
        window.abwa.annotationServerManager.client.searchAnnotations({
          group: window.abwa.groupSelector.currentGroup.id,
          tags: [tag]
        }, (err, annotations) => {
          if (err) {
            reject(err)
          } else {
            resolve(annotations)
          }
        })
      })
    }
    let promises = [
      searchByTagPromise(Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name)
    ]
    // PVSCL:IFCOND(Hierarchy, LINE)
    promises.push(searchByTagPromise(Config.namespace + ':' + Config.tags.grouped.relation + ':' + theme.id))
    // PVSCL:ENDCOND
    Promise.all(promises).then((resolves) => {
      let annotationObjects = resolves[0] // Get annotations done
      let annotations = annotationObjects.map((annotation) => {
        try {
          return Annotation.deserialize(annotation)
        } catch (err) {
          return null
        }
      })
      annotations = _.compact(annotations)
      // Update all the codes with the new name of the theme
      annotations = annotations.map(annotation => {
        let classifyingBody = annotation.getBodyForPurpose(Classifying.purpose)
        if (classifyingBody) {
          if (classifyingBody.value.id === theme.id) {
            classifyingBody.value = theme.toObject()
            return annotation
          } else {
            /* PVSCL:IFCOND(Hierarchy, LINE) */
            if (classifyingBody.value.theme && classifyingBody.value.theme.id === theme.id) {
              let code = theme.codes.find(code => code.id === classifyingBody.value.id)
              if (code) {
                classifyingBody.value = code.toObject()
                return annotation
              }
            }
            /* PVSCL:ELSECOND */
            return null
            /* PVSCL:ENDCOND */
          }
        }
      })
      let promises = annotations.forEach((annotation) => {
        return new Promise((resolve, reject) => {
          window.abwa.annotationServerManager.client.updateAnnotation(annotation.id, annotation, (err, annotation) => {
            if (err) {
              reject(err)
            } else {
              resolve(annotation)
            }
          })
        })
      })
      Promise.all(promises || []).then(() => {})
    })
  }
}

module.exports = UpdateCodebook
