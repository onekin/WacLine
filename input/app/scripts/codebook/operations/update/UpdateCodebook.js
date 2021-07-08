import Events from '../../../Events'
import Alerts from '../../../utils/Alerts'
import _ from 'lodash'
import Config from '../../../Config'
import Theme from '../../model/Theme'
import Classifying from '../../../annotationManagement/purposes/Classifying'
import Annotation from '../../../annotationManagement/Annotation'
// PVSCL:IFCOND(Hierarchy,LINE)
import Code from '../../model/Code'
// PVSCL:ENDCOND
import LanguageUtils from '../../../utils/LanguageUtils'
import CreateAnnotation from '../../../annotationManagement/create/CreateAnnotation'
// PVSCL:IFCOND(ImportChecklist, LINE)
import ImportChecklist from '../import/ImportChecklist'
// PVSCL:ENDCOND


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
    // PVSCL:IFCOND(ImportChecklist, LINE)
    this.initCreateCodesEvent()
    this.initRemoveChecklistEvent()
    this.initRemoveCriteriaEvent()
    // PVSCL:ENDCOND

  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  initCreateThemeEvent () {
    this.events.createThemeEvent = { element: document, event: Events.createTheme, handler: this.createNewThemeEventHandler() }
    this.events.createThemeEvent.element.addEventListener(this.events.createThemeEvent.event, this.events.createThemeEvent.handler, false)
  }

  initUpdateThemeEvent () {
    this.events.updateThemeEvent = { element: document, event: Events.updateTheme, handler: this.createUpdateThemeEventHandler() }
    this.events.updateThemeEvent.element.addEventListener(this.events.updateThemeEvent.event, this.events.updateThemeEvent.handler, false)
  }

  initRemoveThemeEvent (callback) {
    this.events.removeThemeEvent = { element: document, event: Events.removeTheme, handler: this.removeThemeEventHandler() }
    this.events.removeThemeEvent.element.addEventListener(this.events.removeThemeEvent.event, this.events.removeThemeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }
  // PVSCL:IFCOND(ImportChecklist, LINE)

  initRemoveChecklistEvent (callback) {
    this.events.removeChecklistEvent = { element: document, event: Events.removeChecklist, handler: this.removeChecklistEventHandler() }
    this.events.removeChecklistEvent.element.addEventListener(this.events.removeChecklistEvent.event, this.events.removeChecklistEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initRemoveCriteriaEvent (callback) {
    this.events.removeCriteriaEvent = { element: document, event: Events.removeCriteria, handler: this.removeCriteriaEventHandler() }
    this.events.removeCriteriaEvent.element.addEventListener(this.events.removeCriteriaEvent.event, this.events.removeCriteriaEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Hierarchy,LINE)

  initCreateCodeEvent (callback) {
    this.events.createCodeEvent = { element: document, event: Events.createCode, handler: this.createCodeEventHandler() }
    this.events.createCodeEvent.element.addEventListener(this.events.createCodeEvent.event, this.events.createCodeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  // PVSCL:IFCOND(ImportChecklist, LINE)
  initCreateCodesEvent (callback) {
    this.events.createCodesEvent = { element: document, event: Events.createCodes, handler: this.createCodesEventHandler() }
    this.events.createCodesEvent.element.addEventListener(this.events.createCodesEvent.event, this.events.createCodesEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }
  // PVSCL:ENDCOND

  initUpdateCodeEvent () {
    this.events.updateCodeEvent = { element: document, event: Events.updateCode, handler: this.createUpdateCodeEventHandler() }
    this.events.updateCodeEvent.element.addEventListener(this.events.updateCodeEvent.event, this.events.updateCodeEvent.handler, false)
  }

  initRemoveCodeEvent (callback) {
    this.events.removeCodeEvent = { element: document, event: Events.removeCode, handler: this.removeCodeEventHandler() }
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
    const newThemeButton = document.createElement('button')
    newThemeButton.innerText = 'Create new theme'
    newThemeButton.id = 'newThemeButton'
    newThemeButton.className = 'tagButton codingElement'
    newThemeButton.addEventListener('click', () => {
      let selectedText = ''
      let target = []
      // PVSCL:IFCOND(EvidencedCodebook, LINE)
      selectedText = window.getSelection().toString()
      target[0] = { source: { uri: window.abwa.codebookManager.codebookReader.codebook.annotationServer.getGroupUrl() } }
      target = target.concat(CreateAnnotation.obtainTargetToCreateAnnotation({}))
      // PVSCL:ENDCOND
      let newTheme
      Alerts.multipleInputAlert({
        title: 'You are creating a new theme: ',
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" placeholder="New theme name" value="' + selectedText + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="themeDescription" placeholder="Please type a description that describes this theme..."></textarea>',
        preConfirm: () => {
          const themeNameElement = document.querySelector('#themeName')
          let themeName
          if (_.isElement(themeNameElement)) {
            themeName = themeNameElement.value
          }
          const themeDescriptionElement = document.querySelector('#themeDescription')
          let themeDescription
          if (_.isElement(themeDescriptionElement)) {
            themeDescription = themeDescriptionElement.value
          }
          newTheme = new Theme({ name: themeName, description: themeDescription, annotationGuide: window.abwa.codebookManager.codebookReader.codebook, target })
        },
        callback: () => {
          if (newTheme.name.toLowerCase() === 'evaluation') {
            window.abwa.codebookManager.checklistImporter.importChecklist('Evaluation')
          } else if (newTheme.name.toLowerCase() === 'qualitative') {
            window.abwa.codebookManager.checklistImporter.importChecklist('Qualitative')
          } else if (newTheme.name.toLowerCase() === 'quantitative') {
            window.abwa.codebookManager.checklistImporter.importChecklist('Quantitative')
          } else if (newTheme.name.toLowerCase() === 'visualization') {
            window.abwa.codebookManager.checklistImporter.importChecklist('Visualization')
          } else if (newTheme.name.toLowerCase() === 'irr') {
            window.abwa.codebookManager.checklistImporter.importChecklist('IRR')
          } else {
            LanguageUtils.dispatchCustomEvent(Events.createTheme, { theme: newTheme })
          }
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
      const newThemeAnnotation = event.detail.theme.toAnnotation()
      window.abwa.annotationServerManager.client.createNewAnnotation(newThemeAnnotation, (err, annotation) => {
        if (err) {
          Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
        } else {
          LanguageUtils.dispatchCustomEvent(Events.themeCreated, { theme: event.detail.theme, themeAnnotation: annotation })
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
      const theme = event.detail.theme
      let themeToUpdate
      // Show form to update theme
      Alerts.multipleInputAlert({
        title: 'You are updating the theme ' + theme.name,
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" type="text" placeholder="New theme name" value="' + theme.name + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6"  id="themeDescription" placeholder="Please type a description that describes this theme...">' + theme.description + '</textarea>',
        preConfirm: () => {
          const themeNameElement = document.querySelector('#themeName')
          let themeName
          if (_.isElement(themeNameElement)) {
            themeName = themeNameElement.value
          }
          const themeDescriptionElement = document.querySelector('#themeDescription')
          let themeDescription
          if (_.isElement(themeDescriptionElement)) {
            themeDescription = themeDescriptionElement.value
          }
          themeToUpdate = new Theme({
            name: themeName,
            description: themeDescription,
            annotationGuide: window.abwa.codebookManager.codebookReader.codebook,
            createdDate: theme.createdDate,
            target: theme.target
          })
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
      const theme = event.detail.theme
      // Ask user is sure to remove
      Alerts.confirmAlert({
        title: 'Removing code ' + theme.name,
        text: 'Are you sure that you want to remove the theme ' + theme.name + '. All dependant codes will be deleted too. You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          let annotationsToDelete = [theme.id]
          // Get theme codes id to be removed too
          const codesId = _.map(theme.codes, (code) => { return code.id })
          if (_.every(codesId, _.isString)) {
            annotationsToDelete = annotationsToDelete.concat(codesId)
          }
          window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unexpected error when deleting the code. Error: ' + err.message })
            } else {
              LanguageUtils.dispatchCustomEvent(Events.themeRemoved, { theme: theme, themeAnnotation: theme.toAnnotation() })
            }
          })
        }
      })
    }
  }

  // PVSCL:IFCOND(ImportChecklist, LINE)
  /**
   * This function creates a handler to remove a checklist when it receives the removeChecklist event.
   * @return Event
   */
  removeChecklistEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      // Ask user is sure to remove
      Alerts.confirmAlert({
        title: 'Removing checklist ' + theme.name,
        text: 'Are you sure that you want to remove the checklist ' + theme.name + '? You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          // TODO: @inigoBereciartua edit, cannot remove one checklist
          let annotationsToDelete = [theme.id]
          const themeChecklist = ImportChecklist.getChecklistsAnnotation().find((checklistAnnotation) => checklistAnnotation.body[0].value.name === theme.name)
          // Get theme codes id to be removed too
          const codesId = _.map(theme.codes, (code) => { return code.id })
          if (_.every(codesId, _.isString)) {
            annotationsToDelete = annotationsToDelete.concat(codesId)
          }
          if (themeChecklist) {
            annotationsToDelete = annotationsToDelete.concat(themeChecklist.id)
          }
          window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
            } else {
              LanguageUtils.dispatchCustomEvent(Events.themeRemoved, { theme: theme })
            }
          })
        }
      })
    }
  }
  // PVSCL:ENDCOND

  // PVSCL:IFCOND(Hierarchy, LINE)

  /**
   * This function creates a handler to create a new code when it receives the createCode event.
   * @return Events
   */
  createCodeEventHandler () {
    return (event) => {
      let selectedText = ''
      let target = []
      // PVSCL:IFCOND(EvidencedCodebook, LINE)
      selectedText = window.getSelection().toString()
      target[0] = { source: { uri: window.abwa.codebookManager.codebookReader.codebook.annotationServer.getGroupUrl() } }
      target = target.concat(CreateAnnotation.obtainTargetToCreateAnnotation({}))
      // PVSCL:ENDCOND
      const theme = event.detail.theme
      if (!LanguageUtils.isInstanceOf(theme, Theme)) {
        Alerts.errorAlert({ text: 'Unable to create new code, theme is not defined.' })
      } else {
        let newCode // The code that the user is creating
        // Ask user for name and description
        Alerts.multipleInputAlert({
          title: 'You are creating a new code for theme: ',
          html: '<input autofocus class="formCodeName swal2-input" type="text" id="codeName" type="text" placeholder="Code name" value="' + selectedText + '"/>' +
            '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="codeDescription" placeholder="Please type a description that describes this code..."></textarea>',
          preConfirm: () => {
            const codeNameElement = document.querySelector('#codeName')
            let codeName
            if (_.isElement(codeNameElement)) {
              codeName = codeNameElement.value
            }
            const codeDescriptionElement = document.querySelector('#codeDescription')
            let codeDescription
            if (_.isElement(codeDescriptionElement)) {
              codeDescription = codeDescriptionElement.value
            }
            newCode = new Code({ name: codeName, description: codeDescription, theme: theme, target })
          },
          callback: () => {
            const newCodeAnnotation = newCode.toAnnotation()
            window.abwa.annotationServerManager.client.createNewAnnotation(newCodeAnnotation, (err, annotation) => {
              if (err) {
                Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
              } else {
                LanguageUtils.dispatchCustomEvent(Events.codeCreated, { code: newCode, codeAnnotation: annotation, theme: theme })
              }
            })
          }
        })
      }
    }
  }

  // PVSCL:IFCOND(ImportChecklist, LINE)
  createCodesEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      const checklistInfo = event.detail.checklistInfo
      if (!LanguageUtils.isInstanceOf(theme, Theme)) {
        Alerts.errorAlert({ text: 'An error has ocurred creating codes.' })
      } else {
        const codesInfo = event.detail.codesInfo
        let newCode
        let newCodesAnnotations = []
        codesInfo.forEach((codeInfo) => {
          newCode = new Code({ name: codeInfo.name, description: codeInfo.description, theme: theme })
          newCodesAnnotations.push(newCode.toAnnotation())
        })
        window.abwa.annotationServerManager.client.createNewAnnotations(newCodesAnnotations, (err, annotations) => {
          if (err) {
            Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
          } else {
            const newCodes = annotations.map(code => code.id)
            const checklistAnnotation = ImportChecklist.getChecklistsAnnotation()
            const checklistBody = checklistAnnotation.body[0].value
            const checklist = checklistBody.definition.find((checklist) => checklist.name === checklistInfo.name)
            if (checklist) {
              checklist.codes = checklist.codes.concat(newCodes)
            } else {
              const checklistDef = {
                name: checklistInfo.name,
                invalidCriticisms: checklistInfo.invalidCriticisms,
                codes: newCodes
              }
              checklistAnnotation.body[0].value.definition.push(checklistDef)
            }
            
            LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
              annotation: checklistAnnotation
            })


            LanguageUtils.dispatchCustomEvent(Events.codesCreated, { newCodesAnnotations: annotations, theme: theme })
          }
        })
      }
    }
  }

  // PVSCL:ENDCOND
  createUpdateCodeEventHandler () {
    return (event) => {
      const code = event.detail.code
      let codeToUpdate
      // Show form to update theme
      Alerts.multipleInputAlert({
        title: 'You are updating the code ' + code.name + 'pertaining to theme' + code.theme.name,
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="codeName" type="text" placeholder="Code name" value="' + code.name + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="codeDescription" placeholder="Please type a description that describes this code...">' + code.description + '</textarea>',
        preConfirm: () => {
          const codeNameElement = document.querySelector('#codeName')
          let codeName
          if (_.isElement(codeNameElement)) {
            codeName = codeNameElement.value
          }
          const codeDescriptionElement = document.querySelector('#codeDescription')
          let codeDescription
          if (_.isElement(codeDescriptionElement)) {
            codeDescription = codeDescriptionElement.value
          }
          codeToUpdate = new Code({ name: codeName, description: codeDescription, theme: code.theme, target: code.target, createdDate: code.createdDate })
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
    const annotationsToUpdate = codeToUpdate.toAnnotation()
    window.abwa.annotationServerManager.client.updateAnnotation(annotationsToUpdate.id, annotationsToUpdate, (err, annotation) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
        Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
      } else {
        if (_.isFunction(callback)) {
          callback()
        }
        LanguageUtils.dispatchCustomEvent(Events.codeUpdated, { code: codeToUpdate, codeAnnotation: annotation })
      }
    })
  }

  updateAnnotationsWithCode () {
    // TODO Check if this function is necessary
  }

  /**
   * This function creates a handler to remove a code when it receives the removeCode event.
   * @return Events
   */
  removeCodeEventHandler () {
    return (event) => {
      const code = event.detail.code
      // Ask user is sure to remove
      Alerts.confirmAlert({
        title: 'Removing code ' + code.name,
        text: 'Are you sure that you want to remove the code ' + code.name + '. You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          window.abwa.annotationServerManager.client.deleteAnnotation(code.id, (err, result) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unexpected error when deleting the code. Error: ' + err.message })
            } else {
              LanguageUtils.dispatchCustomEvent(Events.codeRemoved, { code: code, codeAnnotation: result.annotation })
            }
          })
        }
      })
    }
  }

  // PVSCL:IFCOND(ImportChecklist, LINE)

  /**
   * This function creates a handler to remove a criteria when it receives the removeCriteria event.
   * @return Events
   */
  removeCriteriaEventHandler () {
    return (event) => {
      const code = event.detail.code
      let checklist = event.detail.checklist
      // Ask user is sure to remove
      Alerts.confirmAlert({
        title: 'Removing criteria ' + code.name,
        text: 'Are you sure that you want to remove the criteria ' + code.name + ' for ' + checklist.body[0].value.name + ' checklist? You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          window.abwa.annotationServerManager.client.deleteAnnotation(code.id, (err, result) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
            } else {
              checklist.body[0].value.definition.forEach((definition) => {
                definition.codes = definition.codes.filter((defCode) => defCode.name !== code.name)
              })
              LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
                annotation: checklist
              })
              LanguageUtils.dispatchCustomEvent(Events.codeRemoved, { code: code })
            }
          })
        }
      })
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND

  updateCodebookTheme (themeToUpdate, callback) {
    const annotationsToUpdate = themeToUpdate.toAnnotations()
    const updatePromises = annotationsToUpdate.map((annotation) => {
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
    Promise
      .all(updatePromises)
      .catch((rejects) => {
        Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + rejects[0].toString() })
      }).then((annotations) => {
        if (_.isFunction(callback)) {
          callback()
        }
        LanguageUtils.dispatchCustomEvent(Events.themeUpdated, { theme: themeToUpdate, themeAnnotations: annotations })
      })
  }

  updateAnnotationsWithTheme (theme) {
    // Get all the annotations done in the group with this theme
    const searchByTagPromise = (tag) => {
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
    const promises = [
      searchByTagPromise(Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name)
    ]
    // PVSCL:IFCOND(Hierarchy, LINE)
    promises.push(searchByTagPromise(Config.namespace + ':' + Config.tags.grouped.relation + ':' + theme.id))
    // PVSCL:ENDCOND
    Promise.all(promises).then((resolves) => {
      const annotationObjects = resolves[0] // Get annotations done
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
        const classifyingBody = annotation.getBodyForPurpose(Classifying.purpose)
        if (classifyingBody) {
          if (classifyingBody.value.id === theme.id) {
            classifyingBody.value = theme.toObject()
            return annotation
          } else {
            /* PVSCL:IFCOND(Hierarchy, LINE) */
            if (classifyingBody.value.theme && classifyingBody.value.theme.id === theme.id) {
              const code = theme.codes.find(code => code.id === classifyingBody.value.id)
              if (code) {
                classifyingBody.value = code.toObject()
                return annotation
              } else {
                return null
              }
            }
            /* PVSCL:ENDCOND */
            return null
          }
        } else {
          return null
        }
      })
      const promises = annotations.forEach((annotation) => {
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

export default UpdateCodebook
