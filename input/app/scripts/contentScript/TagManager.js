const _ = require('lodash')
const $ = require('jquery')
const LanguageUtils = require('../utils/LanguageUtils')
const ColorUtils = require('../utils/ColorUtils')
const Buttons = require('../definition/Buttons')
const Events = require('../Events')
const Alerts = require('../utils/Alerts')
const Config = require('../Config')
const AnnotationGuide = require('../definition/AnnotationGuide')
const Theme = require('../definition/Theme')
// const AnnotationUtils = require('../utils/AnnotationUtils')
// PVSCL:IFCOND(BuiltIn,LINE)
const DefaultHighlighterGenerator = require('../definition/DefaultHighlighterGenerator')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Code,LINE)
const Code = require('../definition/Code')
// PVSCL:ENDCOND

class TagManager {
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
    // Callback
    if (_.isFunction(callback)) {
      callback()
    }
  }

  /**
   * This function retrieves highlighter definition from annotationServer (e.g.: Hypothes.is)
   * @param callback
   */
  getHighlighterDefinition (group, callback) {
    let groupUrl
    if (group) {
      groupUrl = group.links ? group.links.html : group.url
    } else {
      groupUrl = window.abwa.groupSelector.currentGroup.links.html
    }
    window.abwa.annotationServerManager.client.searchAnnotations({
      url: groupUrl,
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
        // PVSCL:IFCOND(MoodleURL,LINE)
        // Remove tags which are not for the current assignment
        let cmid = window.abwa.targetManager.fileMetadata.cmid
        annotations = _.filter(annotations, (annotation) => {
          return this.hasATag(annotation, 'cmid:' + cmid)
        })
        // PVSCL:ENDCOND
        if (_.isFunction(callback)) {
          callback(null, annotations)
        }
      }
    })
  }

  initAllTags (callback) {
    // Retrieve from annotation server highlighter definition
    this.getHighlighterDefinition(null, (err, highlighterDefinitionAnnotations) => {
      if (err) {
        Alerts.errorAlert({text: 'Unable to retrieve annotations from annotation server to initialize highlighter buttons.'}) // TODO i18n
      } else {
        let promise = new Promise((resolve, reject) => {
          if (highlighterDefinitionAnnotations.length === 0) {
            // PVSCL:IFCOND(BuiltIn,LINE)
            // TODO Create definition annotations if Definition->Who is User
            let currentGroupName = window.abwa.groupSelector.currentGroup.name || ''
            Alerts.confirmAlert({
              title: 'Do you want to create a default annotation codebook?',
              text: currentGroupName + ' group has not codes to start annotating. Would you like to configure the highlighter?',
              alertType: Alerts.alertType.question,
              callback: () => {
                Alerts.loadingAlert({
                  title: 'Configuration in progress',
                  text: 'We are configuring everything to start reviewing.',
                  position: Alerts.position.center
                })
                AnnotationGuide.setAnnotationServer(null, (annotationServer) => {
                  DefaultHighlighterGenerator.createDefaultAnnotations(annotationServer, (err, annotations) => {
                    if (err) {
                      reject(new Error('Unable to create default annotations.'))
                    } else {
                      // Open the sidebar, to notify user that the annotator is correctly created
                      window.abwa.sidebar.openSidebar()
                      Alerts.closeAlert()
                      resolve(annotations)
                    }
                  })
                })
              },
              cancelCallback: () => {
                // PVSCL:IFCOND(Update,LINE)
                AnnotationGuide.setAnnotationServer(null, (annotationServer) => {
                  let emptyAnnotationGuide = new AnnotationGuide({annotationServer: annotationServer})
                  let emptyAnnotationGuideAnnotation = emptyAnnotationGuide.toAnnotation()
                  window.abwa.annotationServerManager.client.createNewAnnotation(emptyAnnotationGuideAnnotation, (err, annotation) => {
                    if (err) {
                      Alerts.errorAlert({text: 'Unable to create required configuration for Dynamic highlighter. Please, try it again.'}) // TODO i18n
                    } else {
                      // Open the sidebar, to notify user that the annotator is correctly created
                      window.abwa.sidebar.openSidebar()
                      resolve([annotation])
                    }
                  })
                })
                // PVSCL:ENDCOND
              }
            })
            // PVSCL:ELSECOND
            // TODO Show alert otherwise (no group is defined)
            Alerts.errorAlert({text: 'No group is defined'})
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
          AnnotationGuide.fromAnnotations(annotations, (guide) => {
            this.model.highlighterDefinition = guide
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
      if (theme.codes.length > 0) {
        themeButtonContainer = Buttons.createGroupedButtons({
          id: theme.id,
          name: theme.name,
          className: 'codingElement', // TODO
          description: theme.description,
          color: theme.color,
          childGuideElements: theme.codes,
          groupHandler: (event) => {
            let themeId = event.target.parentElement.parentElement.dataset.codeId
            if (themeId) {
              let theme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeId)
              if (LanguageUtils.isInstanceOf(theme, Theme)) {
                let id = ''
                let tags = ''
                // PVSCL:IFCOND(NOT Multivalued,LINE)
                // First, ask for the currently annotated code
                let currentlyAnnotatedCode = window.abwa.annotatedContentManager.searchAnnotatedCodeForGivenThemeId(themeId)
                // If there is already a code annotation for this theme, we have to let the tags of the code, to annotate with the current code
                if (currentlyAnnotatedCode) {
                  tags = [Config.namespace + ':' + Config.tags.grouped.relation + ':' + theme.name, Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + currentlyAnnotatedCode.code.name]
                  id = currentlyAnnotatedCode.code.id
                // else, we annotate with the theme
                } else {
                  tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name]
                  id = themeId
                }
                // PVSCL:ELSECOND
                tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name]
                id = themeId
                // PVSCL:ENDCOND
                // if we use MoodleURL we push the cmid tag
                // PVSCL:IFCOND(MoodleURL,LINE)
                tags.push('cmid:' + theme.annotationGuide.cmid)
                // PVSCL:ENDCOND
                LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                  purpose: 'classifying',
                  theme: theme,
                  id: id
                })
              }
            }
          },
          buttonHandler: (event) => {
            let codeId = event.target.dataset.codeId
            if (codeId) {
              let code = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(codeId)
              if (LanguageUtils.isInstanceOf(code, Code)) {
                // PVSCL:IFCOND(SingleCode,LINE)
                // Get the annotatedTheme object of the code selected
                let annotatedTheme = window.abwa.annotatedContentManager.getAnnotatedThemeOrCodeFromThemeOrCodeId(code.theme.id)
                // retrive the annotatedTheme object of the code selected
                let currentlyAnnotatedCode = window.abwa.annotatedContentManager.searchAnnotatedCodeForGivenThemeId(code.theme.id)
                // We have to throw the event of codeToAll when:
                // There are still theme annotations or there are annotations of other codes done
                if ((annotatedTheme.hasAnnotations() || (currentlyAnnotatedCode && currentlyAnnotatedCode.code.id !== codeId))) {
                  if (currentlyAnnotatedCode) {
                    // For the case, we are annotating with a code that is not the currently annotated code
                    // In the last case we do not have to throw codeToAll event, we will do the codeToAll after the annotation is created
                    if (!(document.getSelection().toString().length !== 0 && currentlyAnnotatedCode.code.id !== codeId)) {
                      LanguageUtils.dispatchCustomEvent(Events.codeToAll, {
                        codeId: code.id,
                        currentlyAnnotatedCode: currentlyAnnotatedCode
                      })
                    }
                  } else {
                    // In the case that we have annotated with themes until now and there isn't a code annotation yet
                    LanguageUtils.dispatchCustomEvent(Events.codeToAll, {
                      codeId: code.id,
                      currentlyAnnotatedCode: currentlyAnnotatedCode
                    })
                  }
                }
                // PVSCL:ENDCOND
                let tags = [Config.namespace + ':' + Config.tags.grouped.relation + ':' + code.theme.name, Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + code.name]
                // PVSCL:IFCOND(MoodleURL,LINE)
                tags.push('cmid:' + theme.annotationGuide.cmid)
                // PVSCL:ENDCOND
                LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                  purpose: 'classifying',
                  tags: tags,
                  codeId: code.id/* PVSCL:IFCOND(NOT (Multivalued)) */,
                  lastAnnotatedCode: currentlyAnnotatedCode/* PVSCL:ENDCOND */
                })
              }
            }
          }/* PVSCL:IFCOND(Dynamic) */,
          groupRightClickHandler: this.createThemeRightClickHandler(),
          buttonRightClickHandler: this.createCodeRightClickHandler()/* PVSCL:ENDCOND */
        })
      } else {
        themeButtonContainer = Buttons.createButton({
          id: theme.id,
          name: theme.name,
          className: 'codingElement', // TODO
          description: theme.description,
          color: theme.color,
          handler: (event) => {
            let themeId = event.target.dataset.codeId
            if (themeId) {
              let theme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeId)
              if (LanguageUtils.isInstanceOf(theme, Theme)) {
                let tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name]
                // PVSCL:IFCOND(MoodleURL,LINE)
                tags.push('cmid:' + theme.annotationGuide.cmid)
                // PVSCL:ENDCOND
                // TODO If navigation is disabled, create annotation
                LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                  purpose: 'classifying',
                  tags: tags,
                  codeId: theme.id
                })
              }
            }
          }/* PVSCL:IFCOND(Dynamic) */,
          buttonRightClickHandler: this.createThemeRightClickHandler()/* PVSCL:ENDCOND */
        })
      }
      // PVSCL:ELSECOND
      themeButtonContainer = Buttons.createButton({
        id: theme.id,
        name: theme.name,
        className: 'codingElement', // TODO
        description: theme.description,
        color: theme.color,
        handler: (event) => {
          let themeId = event.target.dataset.codeId
          if (themeId) {
            let theme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              let tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name]
              // PVSCL:IFCOND(MoodleURL,LINE)
              tags.push('cmid:' + theme.annotationGuide.cmid)
              // PVSCL:ENDCOND
              LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                purpose: 'classifying',
                tags: tags,
                codeId: theme.id
              })
            }
          }
        }/* PVSCL:IFCOND(Dynamic) */,
        buttonRightClickHandler: this.createThemeRightClickHandler()/* PVSCL:ENDCOND */
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
  // PVSCL:IFCOND(Code and Dynamic, LINE)

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
  // PVSCL:IFCOND(Dynamic, LINE)

  createThemeRightClickHandler () {
    return (themeId) => {
      let items = {}
      // PVSCL:IFCOND(Code, LINE)
      items['createNewCode'] = {name: 'Create new code'}
      // PVSCL:ENDCOND
      items['removeTheme'] = {name: 'Remove theme'}
      return {
        callback: (key) => {
          // PVSCL:IFCOND(Code, LINE)
          if (key === 'createNewCode') {
            let theme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              this.createNewCode({theme: theme})
            }
          }
          // PVSCL:ENDCOND
          if (key === 'removeTheme') {
            let theme = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              this.removeTheme(theme)
            }
          }
        },
        items: items
      }
    }
  }
  // PVSCL:ENDCOND
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
          window.abwa.annotationServerManager.client.createNewAnnotation(newCodeAnnotation, (err, annotation) => {
            if (err) {
              Alerts.errorAlert({text: 'Unable to create the new code. Error: ' + err.toString()})
            } else {
              let code = Code.fromAnnotation(annotation, theme)
              // Add to the model the new theme
              theme.addCode(code)
              // Reload button container
              this.reloadButtonContainer()
              // Reopen sidebar to see the new added code
              window.abwa.sidebar.openSidebar()
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
          window.abwa.annotationServerManager.client.createNewAnnotation(newThemeAnnotation, (err, annotation) => {
            if (err) {
              Alerts.errorAlert({text: 'Unable to create the new code. Error: ' + err.toString()})
            } else {
              let theme = Theme.fromAnnotation(annotation, this.model.highlighterDefinition)
              // Add to the model the new theme
              this.model.highlighterDefinition.addTheme(theme)
              // Reload button container
              this.reloadButtonContainer()
              LanguageUtils.dispatchCustomEvent(Events.tagsUpdated, {})
              // Open the sidebar
              window.abwa.sidebar.openSidebar()
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
  // PVSCL:IFCOND(Dynamic, LINE)

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
        window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
          if (err) {
            Alerts.errorAlert({text: 'Unexpected error when deleting the code.'})
          } else {
            theme.annotationGuide.removeTheme(theme)
            // Reload button container
            this.reloadButtonContainer()
            LanguageUtils.dispatchCustomEvent(Events.tagsUpdated, {})
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
        window.abwa.annotationServerManager.client.deleteAnnotation(code.id, (err, result) => {
          if (err) {
            Alerts.errorAlert({text: 'Unexpected error when deleting the code.'})
          } else {
            code.theme.removeCode(code)
            // Reload button container
            this.reloadButtonContainer()
            LanguageUtils.dispatchCustomEvent(Events.tagsUpdated, {})
          }
        })
      }
    })
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND
}

module.exports = TagManager
