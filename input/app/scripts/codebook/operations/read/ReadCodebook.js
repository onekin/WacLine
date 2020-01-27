const Events = require('../../Events')
const Config = require('../../Config')
const Buttons = require('./Buttons')
const Alerts = require('../../utils/Alerts')
const $ = require('jquery')
const _ = require('lodash')
const Codebook = require('../model/Codebook')
const Theme = require('../model/Theme')
// PVSCL:IFCOND(Hierarchy,LINE)
const Code = require('../model/Code')
// PVSCL:ENDCOND
// PVSCL:IFCOND(BuiltIn,LINE)
const BuiltIn = require('../create/builtIn/BuiltIn')
// PVSCL:ENDCOND
const ColorUtils = require('../../utils/ColorUtils')
const LanguageUtils = require('../../utils/LanguageUtils')
const UpdateCodebook = require('../update/UpdateCodebook')

class ReadCodebook {
  constructor () {
    this.codebook = {}
    this.events = {}
  }

  init () {
    // Add event listener for createAnnotation event
    // PVSCL:IFCOND(CodebookUpdate,LINE)
    this.initThemeCreatedEvent()
    this.initThemeRemovedEvent()
    // PVSCL:IFCOND(Hierarchy,LINE)
    this.initCodeCreatedEvent()
    this.initCodeRemovedEvent()
    // PVSCL:ENDCOND
    // PVSCL:ENDCOND
    this.loadCodebook()
  }

  // EVENTS
  // PVSCL:IFCOND(CodebookUpdate,LINE)
  initThemeCreatedEvent () {
    this.events.themeCreatedEvent = {element: document, event: Events.themeCreated, handler: this.themeCreatedEventHandler()}
    this.events.themeCreatedEvent.element.addEventListener(this.events.themeCreatedEvent.event, this.events.themeCreatedEvent.handler, false)
  }

  initThemeRemovedEvent () {
    this.events.themeRemovedEvent = {element: document, event: Events.themeRemoved, handler: this.themeRemovedEventHandler()}
    this.events.themeRemovedEvent.element.addEventListener(this.events.themeRemovedEvent.event, this.events.themeRemovedEvent.handler, false)
  }
  // PVSCL:IFCOND(Hierarchy,LINE)

  initCodeCreatedEvent () {
    this.events.codeCreatedEvent = {element: document, event: Events.codeCreated, handler: this.codeCreatedEventHandler()}
    this.events.codeCreatedEvent.element.addEventListener(this.events.codeCreatedEvent.event, this.events.codeCreatedEvent.handler, false)
  }

  initCodeRemovedEvent () {
    this.events.codeRemovedEvent = {element: document, event: Events.codeRemoved, handler: this.codeRemovedEventHandler()}
    this.events.codeRemovedEvent.element.addEventListener(this.events.codeRemovedEvent.event, this.events.codeRemovedEvent.handler, false)
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND

  loadCodebook (callback) {
    console.debug('Reading codebook')
    this.initCodebookStructure(() => {
      this.initCodebookContent(() => {
        console.debug('Codebook read')
        if (_.isFunction(callback)) {
          callback()
        }
      })
    })
  }

  /**
   * This function add the html associated to the codebook in the sidebar
   * @param callback
   */
  initCodebookStructure (callback) {
    let tagWrapperUrl = chrome.extension.getURL('pages/sidebar/tagWrapper.html')
    $.get(tagWrapperUrl, (html) => {
      $('#abwaSidebarContainer').append($.parseHTML(html))
      this.buttonContainer = document.querySelector('#buttonContainer')
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  /**
   * This function loads the content of the codebook in the sidebar
   * @param callback
   */
  initCodebookContent (callback) {
    // Retrieve from annotation server highlighter definition
    this.getCodebookDefinition(null, (err, codebookDefinitionAnnotations) => {
      if (err) {
        Alerts.errorAlert({text: 'Unable to retrieve annotations from annotation server to initialize highlighter buttons.'}) // TODO i18n
      } else {
        let promise = new Promise((resolve, reject) => {
          if (codebookDefinitionAnnotations.length === 0) {
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
                Codebook.setAnnotationServer(null, (annotationServer) => {
                  BuiltIn.createDefaultAnnotations(annotationServer, (err, annotations) => {
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
                // PVSCL:IFCOND(CodebookUpdate,LINE)
                Codebook.setAnnotationServer(null, (annotationServer) => {
                  let emptyCodebook = new Codebook({annotationServer: annotationServer})
                  let emptyCodebookAnnotation = emptyCodebook.toAnnotation()
                  window.abwa.annotationServerManager.client.createNewAnnotation(emptyCodebookAnnotation, (err, annotation) => {
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
            resolve(codebookDefinitionAnnotations)
          }
        })
        // After creating annotations
        promise.catch(() => {
          // TODO
          Alerts.errorAlert({text: 'There was an error when configuring highlighter'})
        }).then((annotations) => {
          // Add to model
          Codebook.fromAnnotations(annotations, (guide) => {
            this.codebook = guide
            // Set colors for each element
            this.applyColorsToThemes()
            console.debug(this.codebook)
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

  /**
   * This function retrieves highlighter definition annotations from annotationServer (e.g.: Hypothes.is)
   * @param callback
   */
  getCodebookDefinition (group, callback) {
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
          return this.hasANamespace(annotation, Config.namespace.toString())
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

  createButtons () {
    // PVSCL:IFCOND(CodebookUpdate, LINE)
    // Create new theme button
    UpdateCodebook.createNewThemeButton()
    // PVSCL:ENDCOND
    // Create current buttons
    let themes = this.codebook.themes
    for (let i = 0; i < themes.length; i++) {
      let theme = themes[i]
      let themeButtonContainer
      // PVSCL:IFCOND(Hierarchy,LINE)
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
              let theme = this.codebook.getCodeOrThemeFromId(themeId)
              if (LanguageUtils.isInstanceOf(theme, Theme)) {
                let id = ''
                let tags = ''
                // PVSCL:IFCOND(NOT(Multivalued),LINE)
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
                LanguageUtils.dispatchCustomEvent(Events.annotate, {
                  tags: tags,
                  id: id
                })
              }
            }
          },
          buttonHandler: (event) => {
            let codeId = event.target.dataset.codeId
            if (codeId) {
              let code = this.codebook.getCodeOrThemeFromId(codeId)
              if (LanguageUtils.isInstanceOf(code, Code)) {
                // PVSCL:IFCOND(NOT(Multivalued),LINE)
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
                        id: code.id,
                        currentlyAnnotatedCode: currentlyAnnotatedCode
                      })
                    }
                  } else {
                    // In the case that we have annotated with themes until now and there isn't a code annotation yet
                    LanguageUtils.dispatchCustomEvent(Events.codeToAll, {
                      id: code.id,
                      currentlyAnnotatedCode: currentlyAnnotatedCode
                    })
                  }
                }
                // PVSCL:ENDCOND
                let tags = [Config.namespace + ':' + Config.tags.grouped.relation + ':' + code.theme.name, Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + code.name]
                // PVSCL:IFCOND(MoodleURL,LINE)
                tags.push('cmid:' + theme.annotationGuide.cmid)
                // PVSCL:ENDCOND
                LanguageUtils.dispatchCustomEvent(Events.annotate, {
                  tags: tags,
                  id: code.id/* PVSCL:IFCOND(NOT(Multivalued)) */,
                  lastAnnotatedCode: currentlyAnnotatedCode/* PVSCL:ENDCOND */
                })
              }
            }
          }/* PVSCL:IFCOND(CodebookUpdate) */,
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
              let theme = this.codebook.getCodeOrThemeFromId(themeId)
              if (LanguageUtils.isInstanceOf(theme, Theme)) {
                let tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name]
                // PVSCL:IFCOND(MoodleURL,LINE)
                tags.push('cmid:' + theme.annotationGuide.cmid)
                // PVSCL:ENDCOND
                LanguageUtils.dispatchCustomEvent(Events.annotate, {
                  tags: tags,
                  id: theme.id
                })
              }
            }
          }/* PVSCL:IFCOND(CodebookUpdate) */,
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
            let theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              let tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name]
              // PVSCL:IFCOND(MoodleURL,LINE)
              tags.push('cmid:' + theme.annotationGuide.cmid)
              // PVSCL:ENDCOND
              LanguageUtils.dispatchCustomEvent(Events.annotate, {
                tags: tags,
                id: theme.id
              })
            }
          }
        }/* PVSCL:IFCOND(CodebookUpdate) */,
        buttonRightClickHandler: this.createThemeRightClickHandler()/* PVSCL:ENDCOND */
      })
      // PVSCL:ENDCOND
      if (_.isElement(themeButtonContainer)) {
        this.buttonContainer.append(themeButtonContainer)
      }
    }
  }

  reloadButtonContainer () {
    this.buttonContainer.innerHTML = ''
    this.createButtons()
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

  applyColorsToThemes () {
    if (this.codebook && this.codebook.themes) {
      let listOfColors = ColorUtils.getDifferentColors(this.codebook.themes.length)
      this.codebook.themes.forEach((theme) => {
        let color = listOfColors.pop()
        // PVSCL:IFCOND(Hierarchy,LINE)
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

  createThemeRightClickHandler () {
    return (themeId) => {
      let items = {}
      // PVSCL:IFCOND(CodebookUpdate, LINE)
      // PVSCL:IFCOND(Hierarchy, LINE)
      items['createNewCode'] = {name: 'Create new code'}
      // PVSCL:ENDCOND
      items['removeTheme'] = {name: 'Remove theme'}
      // PVSCL:ENDCOND
      return {
        callback: (key) => {
          // PVSCL:IFCOND(CodebookUpdate, LINE)
          // PVSCL:IFCOND(Hierarchy, LINE)
          if (key === 'createNewCode') {
            let theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              LanguageUtils.dispatchCustomEvent(Events.createCode, {theme: theme})
            }
          }
          // PVSCL:ENDCOND
          if (key === 'removeTheme') {
            let theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              LanguageUtils.dispatchCustomEvent(Events.removeTheme, {theme: theme})
            }
          }
          // PVSCL:ENDCOND
        },
        items: items
      }
    }
  }
  // PVSCL:IFCOND(Hierarchy, LINE)

  createCodeRightClickHandler () {
    return (codeId) => {
      // Get code from id
      let code = this.codebook.getCodeOrThemeFromId(codeId)
      if (LanguageUtils.isInstanceOf(code, Code)) {
        let items = {}
        // PVSCL:IFCOND(CodebookUpdate, LINE)
        items['removeCode'] = {name: 'Remove code'}
        // PVSCL:ENDCOND
        return {
          callback: (key) => {
            // PVSCL:IFCOND(CodebookUpdate, LINE)
            if (key === 'removeCode') {
              LanguageUtils.dispatchCustomEvent(Events.removeCode, {code: code})
            }
            // PVSCL:ENDCOND
          },
          items: items
        }
      }
    }
  }
  // PVSCL:ENDCOND

  themeCreatedEventHandler () {
    return (event) => {
      let theme = Theme.fromAnnotation(event.detail.newThemeAnnotation, this.codebook)
      // Add to the model the new theme
      this.codebook.addTheme(theme)
      // Reload button container
      this.reloadButtonContainer()
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  codeCreatedEventHandler () {
    return (event) => {
      let theme = event.detail.theme
      let code = Code.fromAnnotation(event.detail.newCodeAnnotation, theme)
      // Add to the model the new theme
      theme.addCode(code)
      // Reload button container
      this.reloadButtonContainer()
      // Reopen sidebar to see the new added code
      window.abwa.sidebar.openSidebar()
    }
  }

  themeRemovedEventHandler () {
    return (event) => {
      let theme = event.detail.theme
      theme.annotationGuide.removeTheme(theme)
      // Reload button container
      this.reloadButtonContainer()
    }
  }

  codeRemovedEventHandler () {
    return (event) => {
      let code = event.detail.code
      code.theme.removeCode(code)
      // Reload button container
      this.reloadButtonContainer()
    }
  }


}

module.exports = ReadCodebook
