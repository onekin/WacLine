const _ = require('lodash')
const $ = require('jquery')
const LanguageUtils = require('../utils/LanguageUtils')
const ColorUtils = require('../utils/ColorUtils')
const Buttons = require('../definition/Buttons')
// const AnnotationUtils = require('../utils/AnnotationUtils')
const Events = require('./Events')
const Alerts = require('../utils/Alerts')
//PVSCL:IFCOND(User,LINE)
const DefaultHighlighterGenerator = require('../definition/DefaultHighlighterGenerator')
const Hypothesis = require('../storage/Hypothesis')
//PVSCL:ENDCOND
const Config = require('../Config')
const AnnotationGuide = require('../definition/AnnotationGuide')
const Theme = require('../definition/Theme')
//PVSCL:IFCOND(Code,LINE)
const Code = require('../definition/Code')
//PVSCL:ENDCOND

class MyTagManager {
  constructor () {
    this.model = {
      highlighterDefinitionAnnotations: [], // Highlighter definition annotations
      highlighterDefinition: {}, // Highlighter definition data model
      namespace: Config.namespace,
      config: Config
    }
    this.currentTags = []
    this.events = {}
  }

  init (callback) {
    console.debug('Initializing TagManager')
    this.initTagsStructure(() => {
      this.initEventHandlers(() => {
        this.initAllTags(() => {
          console.debug('Initialized TagManager')
          if (_.isFunction(callback)) {
            callback()
          }
        })
      })
    })
  }

  initTagsStructure (callback) {
    let tagWrapperUrl = chrome.extension.getURL('pages/sidebar/tagWrapper.html')
    $.get(tagWrapperUrl, (html) => {
      $('#abwaSidebarContainer').append($.parseHTML(html))
      this.buttonContainer = document.querySelector('#buttonContainer')
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  initEventHandlers (callback) {
    // For user filter change
    this.events.updatedCurrentAnnotationsEvent = {
      element: document,
      event: Events.updatedCurrentAnnotations,
      handler: this.createUpdatedCurrentAnnotationsEventHandler()
    }
    this.events.updatedCurrentAnnotationsEvent.element.addEventListener(this.events.updatedCurrentAnnotationsEvent.event, this.events.updatedCurrentAnnotationsEvent.handler, false)
    // For annotation created event, reload sidebar with elements chosen and not chosen ones
    this.events.annotationCreated = {
      element: document,
      event: Events.annotationCreated,
      handler: (event) => {
        this.reloadTagsChosen()
      }
    }
    this.events.annotationCreated.element.addEventListener(this.events.annotationCreated.event, this.events.annotationCreated.handler, false)
    // For delete event, reload sidebar with elements chosen and not chosen ones
    this.events.annotationDeleted = {
      element: document,
      event: Events.annotationDeleted,
      handler: (event) => {
        this.reloadTagsChosen()
      }
    }
    this.events.annotationDeleted.element.addEventListener(this.events.annotationDeleted.event, this.events.annotationDeleted.handler, false)
    // When annotations are reloaded
    this.events.updatedAllAnnotations = {
      element: document,
      event: Events.updatedAllAnnotations,
      handler: (event) => {
        this.reloadTagsChosen()
      }
    }
    this.events.updatedAllAnnotations.element.addEventListener(this.events.updatedAllAnnotations.event, this.events.updatedAllAnnotations.handler, false)
    // Callback
    if (_.isFunction(callback)) {
      callback()
    }
  }

  /**
   * This function retrieves highlighter definition from storage (e.g.: Hypothes.is)
   * @param callback
   */
  getHighlighterDefinition (callback) {
    window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({
      url: window.abwa.groupSelector.currentGroup.links.html,
      order: 'desc'
    }, (err, annotations) => {
      if (err) {
        Alerts.errorAlert({text: 'Unable to construct the highlighter. Please reload webpage and try it again.'})
      } else {
        // Retrieve tags which has the namespace
        annotations = _.filter(annotations, (annotation) => {
          return this.hasANamespace(annotation, this.model.namespace)
        })
        // Remove slr:spreadsheet annotation ONLY for SLR case
        annotations = _.filter(annotations, (annotation) => {
          return !this.hasATag(annotation, 'slr:spreadsheet')
        })
        // Remove tags which are not for the current assignment
        /* let cmid = window.abwa.contentTypeManager.fileMetadata.cmid
        annotations = _.filter(annotations, (annotation) => {
          return this.hasATag(annotation, 'exam:cmid:' + cmid)
        }) */
        if (_.isFunction(callback)) {
          callback(null, annotations)
        }
      }
    })
  }

  initAllTags (callback) {
    // Retrieve from storage highlighter definition
    this.getHighlighterDefinition((err, highlighterDefinitionAnnotations) => {
      if (err) {
        Alerts.errorAlert({text: 'Unable to retrieve annotations from storage to initialize highlighter buttons.'}) // TODO i18n
      } else {
        let promise = new Promise((resolve, reject) => {
          if (highlighterDefinitionAnnotations.length === 0) {
            // PVSCL:IFCOND(User,LINE)
            // TODO Create definition annotations if Definition->Who is User
            let currentGroupName = window.abwa.groupSelector.currentGroup.name || ''
            Alerts.confirmAlert({
              text: currentGroupName + ' group has not codes to start annotating. Would you like to configure the highlighter?',
              alertType: Alerts.alertType.question,
              callback: () => {
                Alerts.loadingAlert({
                  title: 'Configuration in progress',
                  text: 'We are configuring everything to start reviewing.',
                  position: Alerts.position.center
                })
                let storage = new Hypothesis({
                  group: window.abwa.groupSelector.currentGroup
                })
                DefaultHighlighterGenerator.createDefaultAnnotations(storage, (err, annotations) => {
                  if (err) {
                    reject(new Error('Unable to create default annotations.'))
                  } else {
                    // Open the sidebar, to notify user that the annotator is correctly created
                    window.abwa.sidebar.openSidebar()
                    Alerts.closeAlert()
                    resolve(annotations)
                  }
                })
              },
              cancelCallback: () => {
                // PVSCL:IFCOND(Dynamic,LINE)
                // TODO In pure::variants: if selected Dynamic, create annotation guide
                let storage = new Hypothesis({
                  group: window.abwa.groupSelector.currentGroup
                })
                let emptyAnnotationGuide = new AnnotationGuide({storage: storage})
                let emptyAnnotationGuideAnnotation = emptyAnnotationGuide.toAnnotation()
                window.abwa.hypothesisClientManager.hypothesisClient.createNewAnnotation(emptyAnnotationGuideAnnotation, (err, annotation) => {
                  if (err) {
                    Alerts.errorAlert({text: 'Unable to create required configuration for Dynamic highlighter. Please, try it again.'}) // TODO i18n
                  } else {
                    // Open the sidebar, to notify user that the annotator is correctly created
                    window.abwa.sidebar.openSidebar()
                    resolve([annotation])
                  }
                })
                // PVSCL:ENDCOND
              }
            })
            // PVSCL:ELSECOND
            // TODO Show alert otherwise (no group is defined)
            // Alerts.errorAlert({text: 'No group is defined'})
            // PVSCL:ENDCOND
          } else {
            resolve(highlighterDefinitionAnnotations)
          }
        })
        // After creating annotations
        promise.catch(() => {
          // TODO
          Alerts.errorAlert({text: 'There was an error when configuring highlighter'})
        }).then((annotations) => {
          // Add to model
          this.model.highlighterDefinitionAnnotations = annotations
          this.model.highlighterDefinition = AnnotationGuide.fromAnnotations(annotations)
          // Set colors for each element
          this.applyColorsToThemes()
          console.debug(this.model.highlighterDefinition)
          // Populate sidebar buttons container
          this.createButtons()
          // this.createTagsButtonsTheme()
          if (_.isFunction(callback)) {
            callback()
          }
        })
        // TODO Create data model from highlighter definition
        // TODO Create buttons from data model
      }
    })
  }

  hasANamespace (annotation, namespace) {
    return _.findIndex(annotation.tags, (annotationTag) => {
      return _.startsWith(annotationTag.toLowerCase(), (namespace + ':').toLowerCase())
    }) !== -1
  }

  hasATag (annotation, tag) {
    return _.findIndex(annotation.tags, (annotationTag) => {
      return _.startsWith(annotationTag.toLowerCase(), tag.toLowerCase())
    }) !== -1
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    // Remove tags wrapper
    $('#tagsWrapper').remove()
  }

  createButtons () {
    // PVSCL:IFCOND(Dynamic, LINE)
    // Create new theme button
    this.createNewThemeButton()
    // PVSCL:ENDCOND
    // Create current buttons
    let themes = this.model.highlighterDefinition.themes
    for (let i = 0; i < themes.length; i++) {
      let theme = themes[i]
      let themeButtonContainer
      // PVSCL:IFCOND(Code,LINE)
      // TODO Theme has codes or not
      if (theme.codes.length > 0) {
        themeButtonContainer = Buttons.createGroupedButtons({
          id: theme.id,
          name: theme.name,
          className: 'codingElement', // TODO
          description: theme.description,
          color: theme.color,
          childGuideElements: theme.codes,
          groupHandler: (event) => {
            let themeId = event.target.parentElement.dataset.codeId
            if (themeId) {
              let theme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeId)
              if (LanguageUtils.isInstanceOf(theme, Theme)) {
                LanguageUtils.dispatchCustomEvent(Events.annotate, {
                  tags: ['oa:theme:' + theme.name],
                  id: theme.id
                })
              }
            }
          },
          buttonHandler: (event) => {
            let codeId = event.target.dataset.codeId
            if (codeId) {
              let code = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(codeId)
              if (LanguageUtils.isInstanceOf(code, Code)) {
                LanguageUtils.dispatchCustomEvent(Events.annotate, {
                  tags: ['oa:isCodeOf:' + code.theme.name, 'oa:code:' + code.name],
                  id: code.id
                })
              }
            }
          },
          groupRightClickHandler: this.createThemeRightClickHandler(),
          buttonRightClickHandler: this.createCodeRightClickHandler()
        })
      } else {
        themeButtonContainer = Buttons.createButton({
          id: theme.id,
          name: theme.name,
          className: 'codingElement',
          description: theme.description,
          color: theme.color,
          handler: (event) => {
            let themeId = event.target.dataset.codeId
            if (themeId) {
              let theme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeId)
              if (LanguageUtils.isInstanceOf(theme, Theme)) {
                LanguageUtils.dispatchCustomEvent(Events.annotate, {
                  tags: ['oa:theme:' + theme.name],
                  id: theme.id
                })
              }
            }
          },
          buttonRightClickHandler: this.createThemeRightClickHandler()
        })
      }
      // PVSCL:ELSECOND
      themeButtonContainer = Buttons.createButton({
        id: theme.id,
        name: theme.name,
        className: 'codingElement',
        description: theme.description,
        color: theme.color,
        handler: (event) => {
          let themeId = event.target.dataset.codeId
          if (themeId) {
            let theme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              LanguageUtils.dispatchCustomEvent(Events.annotate, {
                tags: ['oa:theme:' + theme.name],
                id: theme.id
              })
            }
          }
        },
        buttonRightClickHandler: this.createThemeRightClickHandler()
      })
      // PVSCL:ENDCOND
      if (_.isElement(themeButtonContainer)) {
        this.buttonContainer.append(themeButtonContainer)
      }
    }
  }

  getFilteringTagList () {
    return _.map(this.currentTags, (tagGroup) => {
      return this.getTagFromGroup(tagGroup)
    })
  }

  getTagFromGroup (tagGroup) {
    return this.model.namespace + ':' + this.model.config.grouped.relation + ':' + tagGroup.config.name
  }

  reloadTagsChosen () {
    // TODO
  }

  createUpdatedCurrentAnnotationsEventHandler () {
    // TODO
  }

  applyColorsToThemes () {
    if (this.model.highlighterDefinition && this.model.highlighterDefinition.themes) {
      let listOfColors = ColorUtils.getDifferentColors(this.model.highlighterDefinition.themes.length)
      this.model.highlighterDefinition.themes.forEach((theme) => {
        let color = listOfColors.pop()
        // PVSCL:IFCOND(Code,LINE)
        // Set a color for each theme
        theme.color = ColorUtils.setAlphaToColor(color, Config.colors.minAlpha)
        // Set color gradient for each code
        let numberOfCodes = theme.codes.length
        theme.codes.forEach((code, j) => {
          let alphaForChild = (Config.colors.maxAlpha - Config.colors.minAlpha) / numberOfCodes * (j + 1) + Config.colors.minAlpha
          code.color = ColorUtils.setAlphaToColor(color, alphaForChild)
        })
        // PVSCL:ELSECOND
        theme.color = ColorUtils.setAlphaToColor(color, 0.5)
        // PVSCL:ENDCOND
      })
    }
  }
  // PVSCL:IFCOND(Code, LINE)

  createCodeRightClickHandler () {
    return (codeId) => {
      // Get code from id
      let code = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(codeId)
      if (LanguageUtils.isInstanceOf(code, Code)) {
        let items = {}
        items['removeCode'] = {name: 'Remove code'}
        return {
          callback: (key) => {
            if (key === 'removeCode') {
              this.removeCode(code)
            }
          },
          items: items
        }
      }
    }
  }
  // PVSCL:ENDCOND

  createThemeRightClickHandler () {
    return (themeId) => {
      let items = {}
      // PVSCL:IFCOND(Dynamic, LINE)
      // PVSCL:IFCOND(Code, LINE)
      items['createNewCode'] = {name: 'Create new code'}
      // PVSCL:ENDCOND
      items['removeTheme'] = {name: 'Remove theme'}
      // PVSCL:ENDCOND
      return {
        callback: (key) => {
          // PVSCL:IFCOND(Dynamic, LINE)
          if (key === 'createNewCode') {
            let theme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              this.createNewCode({theme: theme})
            }
          } else if (key === 'removeTheme') {
            let theme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              this.removeTheme(theme)
            }
          }
          // PVSCL:ENDCOND
        },
        items: items
      }
    }
  }
  // PVSCL:IFCOND(Code and Dynamic, LINE)

  createNewCode ({theme, callback}) {
    if (!LanguageUtils.isInstanceOf(theme, Theme)) {
      callback(new Error('Unable to create new code, theme is not defined.'))
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
          window.abwa.hypothesisClientManager.hypothesisClient.createNewAnnotation(newCodeAnnotation, (err, annotation) => {
            if (err) {
              Alerts.errorAlert({text: 'Unable to create the new code. Error: ' + err.toString()})
            } else {
              let code = Code.fromAnnotation(annotation, theme)
              // Add to the model the new theme
              theme.addCode(code)
              // Reload button container
              this.reloadButtonContainer()
            }
          })
        }
      })
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Dynamic, LINE)

  createNewThemeButton () {
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
          newTheme = new Theme({name: themeName, description: themeDescription, annotationGuide: this.model.highlighterDefinition})
        },
        callback: () => {
          let newThemeAnnotation = newTheme.toAnnotation()
          window.abwa.hypothesisClientManager.hypothesisClient.createNewAnnotation(newThemeAnnotation, (err, annotation) => {
            if (err) {
              Alerts.errorAlert({text: 'Unable to create the new code. Error: ' + err.toString()})
            } else {
              let theme = Theme.fromAnnotation(annotation, this.model.highlighterDefinition)
              // Add to the model the new theme
              this.model.highlighterDefinition.addTheme(theme)
              // Reload button container
              this.reloadButtonContainer()
            }
          })
        }
      })
    })
    this.buttonContainer.append(newThemeButton)
  }
  // PVSCL:ENDCOND

  reloadButtonContainer () {
    this.buttonContainer.innerHTML = ''
    this.createButtons()
  }
  //PVSCL:IFCOND(Dynamic, LINE)

  removeTheme (theme) {
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
        window.abwa.hypothesisClientManager.hypothesisClient.deleteAnnotations(annotationsToDelete, (err, result) => {
          if (err) {
            Alerts.errorAlert({text: 'Unexpected error when deleting the code.'})
          } else {
            theme.annotationGuide.removeTheme(theme)
            // Reload button container
            this.reloadButtonContainer()
          }
        })
      }
    })
  }
  // PVSCL:IFCOND(Code, LINE)

  removeCode (code) {
    // Ask user is sure to remove
    Alerts.confirmAlert({
      title: 'Removing code ' + code.name,
      text: 'Are you sure that you want to remove the code ' + code.name + '. You cannot undo this operation.',
      alertType: Alerts.alertType.warning,
      callback: () => {
        window.abwa.hypothesisClientManager.hypothesisClient.deleteAnnotation(code.id, (err, result) => {
          if (err) {
            Alerts.errorAlert({text: 'Unexpected error when deleting the code.'})
          } else {
            code.theme.removeCode(code)
            // Reload button container
            this.reloadButtonContainer()
          }
        })
      }
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND
}

module.exports = MyTagManager
