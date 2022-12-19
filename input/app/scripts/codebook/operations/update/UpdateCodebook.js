import Events from '../../../Events'
import Alerts from '../../../utils/Alerts'
import _ from 'lodash'
import $ from 'jquery'
import Config from '../../../Config'
import Theme from '../../model/Theme'
import Classifying from '../../../annotationManagement/purposes/Classifying'
import Annotation from '../../../annotationManagement/Annotation'
// PVSCL:IFCOND(Hierarchy,LINE)
import Code from '../../model/Code'
// PVSCL:ENDCOND
// PVSCL:IFCOND(Dimensions,LINE)
import Dimension from '../../model/Dimension'
// PVSCL:ENDCOND
import LanguageUtils from '../../../utils/LanguageUtils'
import ImageUtilsOCR from '../../../utils/ImageUtilsOCR'
import ColorUtils from '../../../utils/ColorUtils'


class UpdateCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for updateCodebook event
    this.initCreateThemeEvent()
    this.initRemoveThemeEvent()
    this.initUpdateThemeEvent()
    // PVSCL:IFCOND(Dimensions,LINE)
    this.initCreateDimensionEvent()
    this.initRemoveDimensionEvent()
    this.initUpdateDimensionEvent()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Hierarchy,LINE)
    this.initCreateCodeEvent()
    this.initRemoveCodeEvent()
    this.initUpdateCodeEvent()
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
  // PVSCL:IFCOND(Hierarchy,LINE)

  initCreateCodeEvent (callback) {
    this.events.createCodeEvent = { element: document, event: Events.createCode, handler: this.createCodeEventHandler() }
    this.events.createCodeEvent.element.addEventListener(this.events.createCodeEvent.event, this.events.createCodeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

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

  // PVSCL:IFCOND(Dimensions,LINE)

  initCreateDimensionEvent () {
    this.events.createDimensionEvent = { element: document, event: Events.createDimension, handler: this.createNewDimensionEventHandler() }
    this.events.createDimensionEvent.element.addEventListener(this.events.createDimensionEvent.event, this.events.createDimensionEvent.handler, false)
  }

  initUpdateDimensionEvent () {
    this.events.updateDimensionEvent = { element: document, event: Events.updateDimension, handler: this.createUpdateDimensionEventHandler() }
    this.events.updateDimensionEvent.element.addEventListener(this.events.updateDimensionEvent.event, this.events.updateDimensionEvent.handler, false)
  }

  initRemoveDimensionEvent (callback) {
    this.events.removeDimensionEvent = { element: document, event: Events.removeDimension, handler: this.removeDimensionEventHandler() }
    this.events.removeDimensionEvent.element.addEventListener(this.events.removeDimensionEvent.event, this.events.removeDimensionEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  /**
   * This function adds a button in the sidebar that allows to create new themes.
   */
  static createNewThemeButton (dimensionName) {
    const header = document.createElement('div')
    header.className = 'containerHeaderDimension'
    header.id = 'newThemeButton' + dimensionName
    const headerText = document.createElement('a')
    headerText.innerText = dimensionName
    header.appendChild(headerText)
    header.addEventListener('click', async () => {
      let newTheme
      let target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
      let retrievedThemeName = ''
      // Get user selected content
      let selection = document.getSelection()
      // If selection is child of sidebar, return null
      if (selection.anchorNode) {
        if ($(selection.anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0 || selection.toString().length < 1) {
          if (selection.anchorNode.innerText) {
            retrievedThemeName = selection.anchorNode.innerText
          } else {
            if (selection.anchorNode.nodeName === 'IMG') {
              retrievedThemeName = await ImageUtilsOCR.getStringFromImage(selection.anchorNode)
            } else {
              if (selection.anchorNode.childNodes) {
                let childArray = Array.from(selection.anchorNode.childNodes)
                let imgChild = childArray.filter((node) => {
                  return node.nodeName === 'IMG'
                })
                if (imgChild[0]) {
                  retrievedThemeName = await ImageUtilsOCR.getStringFromImage(imgChild[0])
                }
              }
            }
          }
        } else {
          retrievedThemeName = selection.toString().trim().replace(/^\w/, c => c.toUpperCase())
        }
      }
      Alerts.multipleInputAlert({
        title: 'You are creating a new ' + dimensionName + ' ' + Config.tags.grouped.group + ': ',
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" placeholder="New ' + Config.tags.grouped.group + ' name" value="' + retrievedThemeName + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="themeDescription" placeholder="Please type a description that describes this ' + Config.tags.grouped.group + '..."></textarea>',
        preConfirm: () => {
          const themeNameElement = document.querySelector('#themeName')
          let themeName
          if (_.isElement(themeNameElement)) {
            themeName = themeNameElement.value
          }
          if (themeName.length > 0) {
            if (!this.themeNameExist(themeName)) {
              const themeDescriptionElement = document.querySelector('#themeDescription')
              let themeDescription
              if (_.isElement(themeDescriptionElement)) {
                themeDescription = themeDescriptionElement.value
              }
              newTheme = new Theme({
                name: themeName,
                dimension: dimensionName,
                description: themeDescription,
                annotationGuide: window.abwa.codebookManager.codebookReader.codebook
              })
            } else {
              const swal = require('sweetalert2')
              swal.showValidationMessage('There exist a ' + Config.tags.grouped.group + ' with the same name. Please select a different name.')
            }
          } else {
            const swal = require('sweetalert2')
            swal.showValidationMessage('Name cannot be empty.')
          }
        },
        callback: () => {
          LanguageUtils.dispatchCustomEvent(Events.createTheme, { theme: newTheme, target: target })
        },
        cancelCallback: () => {
          console.log('new theme canceled')
        }
      })
    })
    window.abwa.codebookManager.codebookReader.buttonContainer.append(header)
  }
  // PVSCL:ELSECOND
  /**
   * This function adds a button in the sidebar that allows to create new themes.
   */
  static createNewThemeButton (name) {
    const newThemeButton = document.createElement('button')
    if (name) {
      newThemeButton.innerText = 'New ' + name
    } else {
      newThemeButton.innerText = 'New ' + Config.tags.grouped.group
    }
    newThemeButton.innerText = 'New ' + Config.tags.grouped.group
    newThemeButton.id = 'newThemeButton' + name
    newThemeButton.className = 'tagButton codingElement'
    newThemeButton.addEventListener('click', async () => {
      let newTheme
      let target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
      let retrievedThemeName = ''
      // Get user selected content
      let selection = document.getSelection()
      // If selection is child of sidebar, return null
      if (selection.anchorNode) {
        if ($(selection.anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0 || selection.toString().length < 1) {
          if (selection.anchorNode.innerText) {
            retrievedThemeName = selection.anchorNode.innerText
          } else {
            if (selection.anchorNode.nodeName === 'IMG') {
              retrievedThemeName = await ImageUtilsOCR.getStringFromImage(selection.anchorNode)
            } else {
              if (selection.anchorNode.childNodes) {
                let childArray = Array.from(selection.anchorNode.childNodes)
                let imgChild = childArray.filter((node) => {
                  return node.nodeName === 'IMG'
                })
                if (imgChild[0]) {
                  retrievedThemeName = await ImageUtilsOCR.getStringFromImage(imgChild[0])
                }
              }
            }
          }
        } else {
          retrievedThemeName = selection.toString().trim().replace(/^\w/, c => c.toUpperCase())
        }
      }
      Alerts.multipleInputAlert({
        title: 'You are creating a new ' + Config.tags.grouped.group + ': ',
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" placeholder="New ' + Config.tags.grouped.group + ' name" value="' + retrievedThemeName + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="themeDescription" placeholder="Please type a description that describes this ' + Config.tags.grouped.group + '..."></textarea>',
        preConfirm: () => {
          const themeNameElement = document.querySelector('#themeName')
          let themeName
          if (_.isElement(themeNameElement)) {
            themeName = themeNameElement.value
          }
          if (themeName.length > 0) {
            if (!this.themeNameExist(themeName)) {
              const themeDescriptionElement = document.querySelector('#themeDescription')
              let themeDescription
              if (_.isElement(themeDescriptionElement)) {
                themeDescription = themeDescriptionElement.value
              }
              newTheme = new Theme({
                name: themeName,
                description: themeDescription,
                annotationGuide: window.abwa.codebookManager.codebookReader.codebook
              })
            } else {
              const swal = require('sweetalert2')
              swal.showValidationMessage('There exist a ' + Config.tags.grouped.group + ' with the same name. Please select a different name.')
            }
          } else {
            const swal = require('sweetalert2')
            swal.showValidationMessage('Name cannot be empty.')
          }
        },
        callback: () => {
          LanguageUtils.dispatchCustomEvent(Events.createTheme, { theme: newTheme, target: target })
        },
        cancelCallback: () => {
          console.log('new theme canceled')
        }
      })
    })
    window.abwa.codebookManager.codebookReader.buttonContainer.append(newThemeButton)
  }
  // PVSCL:ENDCOND

  // PVSCL:IFCOND(Dimensions,LINE)
  /**
   * This function adds a button in the sidebar that allows to create new themes.
   */
  static createNewDimensionButton (dimensionName) {
    const newDimensionButton = document.createElement('button')
    newDimensionButton.innerText = 'New THEME'
    newDimensionButton.id = 'newDimensionButton'
    newDimensionButton.className = 'tagButton codingElement'
    newDimensionButton.addEventListener('click', async () => {
      if (window.abwa.codebookManager.codebookReader.codebook.dimensions.length < 12) {
        let newDimension
        let target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
        let retrievedDimensionName = ''
        // Get user selected content
        let selection = document.getSelection()
        // If selection is child of sidebar, return null
        if (selection.anchorNode) {
          if ($(selection.anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0 || selection.toString().length < 1) {
            if (selection.anchorNode.innerText) {
              retrievedDimensionName = selection.anchorNode.innerText
            } else {
              if (selection.anchorNode.nodeName === 'IMG') {
                retrievedDimensionName = await ImageUtilsOCR.getStringFromImage(selection.anchorNode)
              } else {
                if (selection.anchorNode.childNodes) {
                  let childArray = Array.from(selection.anchorNode.childNodes)
                  let imgChild = childArray.filter((node) => {
                    return node.nodeName === 'IMG'
                  })
                  if (imgChild[0]) {
                    retrievedDimensionName = await ImageUtilsOCR.getStringFromImage(imgChild[0])
                  }
                }
              }
            }
          } else {
            retrievedDimensionName = selection.toString().trim().replace(/^\w/, c => c.toUpperCase())
          }
        }
        Alerts.multipleInputAlert({
          title: 'You are creating a new theme:',
          html: '<input autofocus class="formCodeName swal2-input" type="text" id="dimensionName" placeholder="New ' + 'theme' + ' name" value="' + retrievedDimensionName + '"/>' +
            '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="dimensionDescription" placeholder="Please type a description that describes this theme' + '..."></textarea>',
          preConfirm: () => {
            const dimensionNameElement = document.querySelector('#dimensionName')
            let dimensionName
            if (_.isElement(dimensionNameElement)) {
              dimensionName = dimensionNameElement.value
            }
            if (dimensionName.length > 0) {
              if (!this.dimensionNameExist(dimensionName)) {
                const dimensionDescriptionElement = document.querySelector('#dimensionDescription')
                let dimensionDescription
                if (_.isElement(dimensionDescriptionElement)) {
                  dimensionDescription = dimensionDescriptionElement.value
                }
                let dimensionColor = ColorUtils.getDimensionColor(window.abwa.codebookManager.codebookReader.codebook.dimensions)
                newDimension = new Dimension({
                  name: dimensionName,
                  description: dimensionDescription,
                  color: dimensionColor,
                  annotationGuide: window.abwa.codebookManager.codebookReader.codebook
                })
              } else {
                const swal = require('sweetalert2')
                swal.showValidationMessage('There exist a ' + Config.tags.grouped.group + ' with the same name. Please select a different name.')
              }
            } else {
              const swal = require('sweetalert2')
              swal.showValidationMessage('Name cannot be empty.')
            }
          },
          callback: () => {
            LanguageUtils.dispatchCustomEvent(Events.createDimension, { dimension: newDimension, target: target })
          },
          cancelCallback: () => {
            console.log('new dimension canceled')
          }
        })
      } else {

      }
    })
    window.abwa.codebookManager.codebookReader.buttonContainer.append(newDimensionButton)
  }

  static dimensionNameExist (newDimensionName) {
    let dimensions = window.abwa.codebookManager.codebookReader.codebook.dimensions
    let dimension = _.find(dimensions, (dimension) => {
      return dimension.name === newDimensionName
    })
    if (dimension) {
      return true
    } else {
      return false
    }
  }

  /**
   * This function creates a handler to create a new theme when it receives the createTheme event.
   * @return Event
   */
  createNewDimensionEventHandler () {
    return (event) => {
      const newDimensionAnnotation = event.detail.dimension.toAnnotation()
      window.abwa.annotationServerManager.client.createNewAnnotation(newDimensionAnnotation, (err, annotation) => {
        if (err) {
          Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
        } else {
          LanguageUtils.dispatchCustomEvent(Events.dimensionCreated, { newDimensionAnnotation: annotation, target: event.detail.target })
        }
      })
    }
  }

  /**
   * This function creates a handler to update a new theme when it receives the updateTheme event.
   * @return Event
   */
  createUpdateDimensionEventHandler () {
    return (event) => {
      const dimension = event.detail.dimension
      let dimensionToUpdate
      // Show form to update theme
      Alerts.multipleInputAlert({
        title: 'You are updating the theme ' + dimension.name,
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" type="text" placeholder="New theme name" value="' + dimension.name + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6"  id="themeDescription" placeholder="Please type a description that describes this theme...">' + dimension.description + '</textarea>',
        preConfirm: () => {
          const dimensionNameElement = document.querySelector('#dimensionName')
          let dimensionName
          if (_.isElement(dimensionNameElement)) {
            dimensionName = dimensionNameElement.value
          }
          const dimensionDescriptionElement = document.querySelector('#dimensionDescription')
          let dimensionDescription
          if (_.isElement(dimensionDescriptionElement)) {
            dimensionDescription = dimensionDescriptionElement.value
          }
          dimensionToUpdate = new Dimension({ name: dimensionName, description: dimensionDescription, annotationGuide: window.abwa.codebookManager.codebookReader.codebook })
          // PVSCL:IFCOND(Hierarchy, LINE)
          theme.codes.forEach(code => { code.theme = themeToUpdate })
          themeToUpdate.codes = theme.codes
          // PVSCL:ENDCOND
          dimensionToUpdate.id = dimension.id
        },
        callback: () => {
          // Update codebook
          this.updateCodebookTheme(dimensionToUpdate)
          // Update all annotations done with this theme
          this.updateAnnotationsWithTheme(dimensionToUpdate)
        },
        cancelCallback: () => {
          // showForm(preConfirmData)
        }
      })
    }
  }

  /**
   * This function creates a handler to remove a theme when it receives the removeTheme event.
   * @return Event
   */
  removeDimensionEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      // Ask user is sure to remove
      Alerts.confirmAlert({
        title: 'Removing ' + Config.tags.grouped.group + theme.name,
        text: 'Are you sure that you want to remove the ' + Config.tags.grouped.group + ' ' + theme.name + '. All dependant codes will be deleted too. You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          let annotationsToDelete = [theme.id]
          // Get theme codes id to be removed too
          const codesId = _.map(theme.codes, (code) => { return code.id })
          if (_.every(codesId, _.isString)) {
            annotationsToDelete = annotationsToDelete.concat(codesId)
          }
          // Get linking annotions made with removed theme
          // PVSCL:IFCOND(Linking, LINE)
          let groupLinkingAnnotations = window.abwa.annotationManagement.annotationReader.groupLinkingAnnotations
          let linkingAnnotationToRemove = _.filter(groupLinkingAnnotations, (linkingAnnotation) => {
            let linkingBody = linkingAnnotation.body[0]
            return linkingBody.value.from.id === theme.id || linkingBody.value.to === theme.id
          })
          console.log(linkingAnnotationToRemove)
          let linkingsId = _.map(linkingAnnotationToRemove, (annotation) => { return annotation.id })
          if (_.every(linkingsId, _.isString)) {
            annotationsToDelete = annotationsToDelete.concat(linkingsId)
          }
          // PVSCL:ENDCOND
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

  static themeNameExist (newThemeName) {
    let themes = window.abwa.codebookManager.codebookReader.codebook.themes
    let theme = _.find(themes, (theme) => {
      return theme.name === newThemeName
    })
    if (theme) {
      return true
    } else {
      return false
    }
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
          LanguageUtils.dispatchCustomEvent(Events.themeCreated, { newThemeAnnotation: annotation, target: event.detail.target })
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
          // PVSCL:IFCOND(TopicBased, LINE)
          if (theme.isTopic) {
            themeToUpdate = new Theme({ name: themeName, description: themeDescription, isTopic: true, annotationGuide: window.abwa.codebookManager.codebookReader.codebook })
          } else {
            themeToUpdate = new Theme({ name: themeName, description: themeDescription, annotationGuide: window.abwa.codebookManager.codebookReader.codebook })
          }
          // PVSCL:ELSECOND
          themeToUpdate = new Theme({ name: themeName, description: themeDescription, annotationGuide: window.abwa.codebookManager.codebookReader.codebook })
          // PVSCL:ENDCOND
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
        },
        cancelCallback: () => {
          // showForm(preConfirmData)
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
        title: 'Removing ' + Config.tags.grouped.group + theme.name,
        text: 'Are you sure that you want to remove the ' + Config.tags.grouped.group + ' ' + theme.name + '. All dependant codes will be deleted too. You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          let annotationsToDelete = [theme.id]
          // Get theme codes id to be removed too
          const codesId = _.map(theme.codes, (code) => { return code.id })
          if (_.every(codesId, _.isString)) {
            annotationsToDelete = annotationsToDelete.concat(codesId)
          }
          // Get linking annotions made with removed theme
          // PVSCL:IFCOND(Linking, LINE)
          let groupLinkingAnnotations = window.abwa.annotationManagement.annotationReader.groupLinkingAnnotations
          let linkingAnnotationToRemove = _.filter(groupLinkingAnnotations, (linkingAnnotation) => {
            let linkingBody = linkingAnnotation.body[0]
            return linkingBody.value.from.id === theme.id || linkingBody.value.to === theme.id
          })
          console.log(linkingAnnotationToRemove)
          let linkingsId = _.map(linkingAnnotationToRemove, (annotation) => { return annotation.id })
          if (_.every(linkingsId, _.isString)) {
            annotationsToDelete = annotationsToDelete.concat(linkingsId)
          }
          // PVSCL:ENDCOND
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
  // PVSCL:IFCOND(Hierarchy, LINE)

  /**
   * This function creates a handler to create a new code when it receives the createCode event.
   * @return Events
   */
  createCodeEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      if (!LanguageUtils.isInstanceOf(theme, Theme)) {
        Alerts.errorAlert({ text: 'Unable to create new code, theme is not defined.' })
      } else {
        let newCode // The code that the user is creating
        // Ask user for name and description
        Alerts.multipleInputAlert({
          title: 'You are creating a new code for theme: ',
          html: '<input autofocus class="formCodeName swal2-input" type="text" id="codeName" type="text" placeholder="Code name" value=""/>' +
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
            newCode = new Code({ name: codeName, description: codeDescription, theme: theme })
          },
          callback: () => {
            const newCodeAnnotation = newCode.toAnnotation()
            window.abwa.annotationServerManager.client.createNewAnnotation(newCodeAnnotation, (err, annotation) => {
              if (err) {
                Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
              } else {
                LanguageUtils.dispatchCustomEvent(Events.codeCreated, { newCodeAnnotation: annotation, theme: theme })
              }
            })
          }
        })
      }
    }
  }

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
          codeToUpdate = new Code({ name: codeName, description: codeDescription, theme: code.theme })
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
        LanguageUtils.dispatchCustomEvent(Events.codeUpdated, { updatedCode: codeToUpdate })
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
      const code = event.detail.code
      // Ask user is sure to remove
      Alerts.confirmAlert({
        title: 'Removing code ' + code.name,
        text: 'Are you sure that you want to remove the code ' + code.name + '. You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          window.abwa.annotationServerManager.client.deleteAnnotation(code.id, (err, result) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
            } else {
              LanguageUtils.dispatchCustomEvent(Events.codeRemoved, { code: code })
            }
          })
        }
      })
    }
  }
  // PVSCL:ENDCOND

  updateCodebookTheme (themeToUpdate, callback) {
    const annotationsToUpdate = themeToUpdate.toAnnotations()
    const updatePromises = annotationsToUpdate.map((annotation) => {
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
        Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + rejects[0].toString() })
      }).then(() => {
        if (_.isFunction(callback)) {
          callback()
        }
        LanguageUtils.dispatchCustomEvent(Events.themeUpdated, { updatedTheme: themeToUpdate })
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
