const Events = require('../../../Events')
const Config = require('../../../Config')
const Buttons = require('./Buttons')
const Alerts = require('../../../utils/Alerts')
const $ = require('jquery')
const _ = require('lodash')
const Codebook = require('../../model/Codebook')
const Theme = require('../../model/Theme')
// PVSCL:IFCOND(Hierarchy,LINE)
const Code = require('../../model/Code')
// PVSCL:ENDCOND
const ColorUtils = require('../../../utils/ColorUtils')
const LanguageUtils = require('../../../utils/LanguageUtils')
// PVSCL:IFCOND(CodebookUpdate, LINE)
const UpdateCodebook = require('../update/UpdateCodebook')
// PVSCL:ENDCOND

class ReadCodebook {
  constructor () {
    this.codebook = {}
    this.events = {}
  }

  init (callback) {
    // Add event listener for codebook read event
    this.initCodebookReadEvent()
    this.initCodebookCreatedEvent()
    // PVSCL:IFCOND(CodebookUpdate,LINE)
    this.initThemeCreatedEvent()
    this.initThemeUpdatedEvent()
    this.initThemeRemovedEvent()
    // PVSCL:IFCOND(Hierarchy,LINE)
    this.initCodeCreatedEvent()
    this.initCodeUpdatedEvent()
    this.initCodeRemovedEvent()
    // PVSCL:ENDCOND
    // PVSCL:ENDCOND
    this.loadCodebook(callback)
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    // Remove buttons container
    $('#tagsWrapper').remove()
  }

  // EVENTS
  // PVSCL:IFCOND(CodebookUpdate,LINE)
  initThemeCreatedEvent () {
    this.events.themeCreatedEvent = {element: document, event: Events.themeCreated, handler: this.themeCreatedEventHandler()}
    this.events.themeCreatedEvent.element.addEventListener(this.events.themeCreatedEvent.event, this.events.themeCreatedEvent.handler, false)
  }

  initThemeUpdatedEvent () {
    this.events.themeUpdatedEvent = {element: document, event: Events.themeUpdated, handler: this.themeUpdatedEventHandler()}
    this.events.themeUpdatedEvent.element.addEventListener(this.events.themeUpdatedEvent.event, this.events.themeUpdatedEvent.handler, false)
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

  initCodeUpdatedEvent () {
    this.events.codeUpdatedEvent = {element: document, event: Events.codeUpdated, handler: this.codeUpdatedEventHandler()}
    this.events.codeUpdatedEvent.element.addEventListener(this.events.codeUpdatedEvent.event, this.events.codeUpdatedEvent.handler, false)
  }

  initCodeRemovedEvent () {
    this.events.codeRemovedEvent = {element: document, event: Events.codeRemoved, handler: this.codeRemovedEventHandler()}
    this.events.codeRemovedEvent.element.addEventListener(this.events.codeRemovedEvent.event, this.events.codeRemovedEvent.handler, false)
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND

  initCodebookReadEvent () {
    this.events.codebookReadEvent = {element: document, event: Events.codebookRead, handler: this.codebookReadEventHandler()}
    this.events.codebookReadEvent.element.addEventListener(this.events.codebookReadEvent.event, this.events.codebookReadEvent.handler, false)
  }

  initCodebookCreatedEvent () {
    this.events.codebookCreatedEvent = {element: document, event: Events.codebookCreated, handler: this.codebookCreatedEventHandler()}
    this.events.codebookCreatedEvent.element.addEventListener(this.events.codebookCreatedEvent.event, this.events.codebookCreatedEvent.handler, false)
  }

  /**
   * Loads the codebook inside the sidebar
   * @param callback
   */
  loadCodebook (callback) {
    console.debug('Reading codebook')
    this.initCodebookStructure(() => {
      this.initFirstCodebookReadEventHandler(() => {
        this.initCodebookContent()
      }, callback)
    })
  }

  initFirstCodebookReadEventHandler (callback, callbackToExecuteAfterRead) {
    this.events.firstCodebookReadEvent = {element: document, event: Events.codebookRead, handler: this.codebookReadEventListener(callbackToExecuteAfterRead)}
    this.events.firstCodebookReadEvent.element.addEventListener(this.events.firstCodebookReadEvent.event, this.events.firstCodebookReadEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  codebookReadEventListener (callback) {
    return (event) => {
      if (_.isFunction(callback)) {
        callback()
      }
      // Remove codebook read event listener after first read
      let eventHandlerToDisable = this.events.firstCodebookReadEvent
      eventHandlerToDisable.element.removeEventListener(eventHandlerToDisable.event, eventHandlerToDisable.handler)
    }
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
        if (codebookDefinitionAnnotations.length === 0) {
          // PVSCL:IFCOND(BuiltIn AND NOT(ApplicationBased), LINE)
          let currentGroupName = window.abwa.groupSelector.currentGroup.name || ''
          Alerts.confirmAlert({
            title: 'Do you want to create a default annotation codebook?',
            text: currentGroupName + ' group has not codes to start annotating. Would you like to configure the highlighter?',
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
            alertType: Alerts.alertType.question,
            callback: () => {
              Alerts.loadingAlert({
                title: 'Configuration in progress',
                text: 'We are configuring everything to start reviewing.',
                position: Alerts.position.center
              })
              Codebook.setAnnotationServer(null, (annotationServer) => {
                LanguageUtils.dispatchCustomEvent(Events.createCodebook, {howCreate: 'builtIn'})
              })
            },
            cancelCallback: () => {
              // PVSCL:IFCOND(CodebookUpdate,LINE)
              LanguageUtils.dispatchCustomEvent(Events.createCodebook, {howCreate: 'emptyCodebook'})
              // PVSCL:ENDCOND
            }
          })
          // PVSCL:ELSEIFCOND(ApplicationBased, LINE)
          Codebook.setAnnotationServer(null, (annotationServer) => {
            LanguageUtils.dispatchCustomEvent(Events.createCodebook, {howCreate: 'builtIn'})
          })
          // PVSCL:ELSEIFCOND(NOT(Codebook))
          LanguageUtils.dispatchCustomEvent(Events.createCodebook, {howCreate: 'noCodebook'}) // The parameter howCreate is not really necessary in current implementation
          // PVSCL:ELSECOND
          // TODO Show alert otherwise (no group is defined)
          Alerts.errorAlert({text: 'No group is defined'})
          // PVSCL:ENDCOND
        } else {
          Codebook.fromAnnotations(codebookDefinitionAnnotations, (err, codebook) => {
            if (err) {
              Alerts.errorAlert({text: 'Error parsing codebook. Error: ' + err.message})
            } else {
              this.codebook = codebook
              LanguageUtils.dispatchCustomEvent(Events.codebookRead, {codebook: this.codebook})
            }
          })
        }
        if (_.isFunction(callback)) {
          callback()
        }
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
        // PVSCL:IFCOND(MoodleResource,LINE)
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

  codebookReadEventHandler () {
    return (event) => {
      this.codebook = event.detail.codebook
      // PVSCL:IFCOND(Codebook, LINE)
      // Set colors for each element
      this.applyColorsToThemes()
      // PVSCL:ENDCOND
      // Populate sidebar buttons container
      this.createButtons()
    }
  }

  /**
   * This function adds the buttons that must appear in the sidebar to be able to annotate
   */
  createButtons () {
    // PVSCL:IFCOND(CodebookUpdate, LINE)
    // Create new theme button
    UpdateCodebook.createNewThemeButton()
    // PVSCL:ENDCOND
    // Create current buttons
    let themes = this.codebook.themes
    // PVSCL:IFCOND(Alphabetical, LINE)
    themes.sort((a, b) => a.name.localeCompare(b.name))
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Number, LINE)
    themes.sort((a, b) => parseFloat(a.name) - parseFloat(b.name))
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Date, LINE)
    themes.sort((a, b) => a.createdDate - b.createdDate)
    // PVSCL:ENDCOND
    for (let i = 0; i < themes.length; i++) {
      let theme = themes[i]
      let themeButtonContainer
      // PVSCL:IFCOND(Hierarchy,LINE)
      let codes = theme.codes
      codes = codes.sort((a, b) => {
        // PVSCL:IFCOND(Alphabetical, LINE)
        return a.name.localeCompare(b.name)
        // PVSCL:ELSEIFCOND(Number, LINE)
        // PVSCL:ELSEIFCOND(Date, LINE)
        // PVSCL:ENDCOND
      })
      // PVSCL:IFCOND(Alphabetical, LINE)
      codes = codes.sort((a, b) => a.name.localeCompare(b.name))
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(Number, LINE)
      codes = codes.sort((a, b) => parseFloat(a.name) - parseFloat(b.name))
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(Date, LINE)
      codes = codes.sort((a, b) => a.createdDate - b.createdDate)
      // PVSCL:ENDCOND
      if (theme.codes.length > 0) {
        themeButtonContainer = this.createGroupedThemeButtonContainer(theme, codes)
      } else {
        themeButtonContainer = this.createThemeButtonContainer(theme)
      }
      // PVSCL:ELSECOND
      themeButtonContainer = this.createThemeButtonContainer(theme)
      // PVSCL:ENDCOND
      if (_.isElement(themeButtonContainer)) {
        this.buttonContainer.append(themeButtonContainer)
      }
    }
  }

  createGroupedThemeButtonContainer (theme, codes) {
    return Buttons.createGroupedButtons({
      id: theme.id,
      name: theme.name,
      className: 'codingElement',
      description: theme.description,
      color: theme.color,
      childGuideElements: codes,
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
            // PVSCL:IFCOND(MoodleResource,LINE)
            // We are using MoodleResource feature so need to push the cmid tag
            tags.push('cmid:' + theme.annotationGuide.cmid)
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(SidebarNavigation, LINE)
            // Test if text is selected
            if (document.getSelection().toString().length > 0) {
              // If selected create annotation
              LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                purpose: 'classifying',
                tags: tags,
                theme: theme,
                codeId: id
              })
            } else {
              // Else navigate to annotation
              LanguageUtils.dispatchCustomEvent(Events.navigateToAnnotationByCode, {
                codeId: theme.id
              })
            }
            // PVSCL:ELSECOND
            // If selected create annotation
            LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
              purpose: 'classifying',
              tags: tags,
              theme: theme,
              codeId: id
            })
            // PVSCL:ENDCOND
          }
        }
      },
      buttonHandler: (event) => {
        let codeId = event.target.dataset.codeId
        if (codeId) {
          let code = this.codebook.getCodeOrThemeFromId(codeId)
          if (LanguageUtils.isInstanceOf(code, Code)) {
            // PVSCL:IFCOND(NOT(Multivalued),LINE)
            // The rest of the annotations must be classified with this code too
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
                if (currentlyAnnotatedCode.code.id !== codeId) {
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
            // Create new annotation if text selected
            if (document.getSelection().toString().length > 0) {
              // Create new annotation
              let tags = [Config.namespace + ':' + Config.tags.grouped.relation + ':' + code.theme.name, Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + code.name]
              // PVSCL:IFCOND(MoodleResource,LINE)
              tags.push('cmid:' + theme.annotationGuide.cmid)
              // PVSCL:ENDCOND
              LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                purpose: 'classifying',
                tags: tags,
                codeId: code.id
              })
            }
            // PVSCL:ELSECOND
            let tags = [Config.namespace + ':' + Config.tags.grouped.relation + ':' + code.theme.name, Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + code.name]
            // PVSCL:IFCOND(MoodleResource,LINE)
            tags.push('cmid:' + theme.annotationGuide.cmid)
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(SidebarNavigation, LINE)
            // Test if text is selected
            if (document.getSelection().toString().length > 0) {
              // If selected create annotation
              LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                purpose: 'classifying',
                tags: tags,
                codeId: code.id/* PVSCL:IFCOND(NOT (Multivalued)) */,
                lastAnnotatedCode: currentlyAnnotatedCode/* PVSCL:ENDCOND */
              })
            } else {
              // Else navigate to annotation
              LanguageUtils.dispatchCustomEvent(Events.navigateToAnnotationByCode, {
                codeId: code.id
              })
            }
            // PVSCL:ELSECOND
            LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
              purpose: 'classifying',
              tags: tags,
              codeId: code.id/* PVSCL:IFCOND(NOT (Multivalued)) */,
              lastAnnotatedCode: currentlyAnnotatedCode/* PVSCL:ENDCOND */
            })
            // PVSCL:ENDCOND
            // PVSCL:ENDCOND
          }
        }
      }/* PVSCL:IFCOND(CodebookUpdate) */,
      groupRightClickHandler: this.themeRightClickHandler(),
      buttonRightClickHandler: this.codeRightClickHandler()/* PVSCL:ENDCOND */
    })
  }

  createThemeButtonContainer (theme) {
    return Buttons.createButton({
      id: theme.id,
      name: theme.name,
      className: 'codingElement',
      description: theme.description,
      color: theme.color,
      handler: (event) => {
        let themeId = event.target.dataset.codeId
        if (themeId) {
          let theme = this.codebook.getCodeOrThemeFromId(themeId)
          if (LanguageUtils.isInstanceOf(theme, Theme)) {
            let tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name]
            // PVSCL:IFCOND(MoodleResource,LINE)
            tags.push('cmid:' + theme.annotationGuide.cmid)
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(SidebarNavigation, LINE)
            // Test if text is selected
            if (document.getSelection().toString().length > 0) {
              // If selected create annotation
              LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                purpose: 'classifying',
                tags: tags,
                codeId: theme.id
              })
            } else {
              // Else navigate to annotation
              LanguageUtils.dispatchCustomEvent(Events.navigateToAnnotationByCode, {
                codeId: theme.id
              })
            }
            // PVSCL:ELSECOND
            LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
              purpose: 'classifying',
              tags: tags,
              codeId: theme.id
            })
            // PVSCL:ENDCOND
          }
        }
      }/* PVSCL:IFCOND(CodebookUpdate) */,
      buttonRightClickHandler: this.themeRightClickHandler()/* PVSCL:ENDCOND */
    })
  }

  /**
   * Reloads the button if a new button has been added or deleted
   */
  reloadButtonContainer () {
    this.buttonContainer.innerHTML = ''
    this.createButtons()
  }

  /**
   * Retrieve tags which has the given namespace
   * @param annotation, namespace
   */
  hasANamespace (annotation, namespace) {
    return _.findIndex(annotation.tags, (annotationTag) => {
      return _.startsWith(annotationTag.toLowerCase(), (namespace + ':').toLowerCase())
    }) !== -1
  }

  /**
   * Returns true if the annotation has the given tag
   * @param annotation, tag
   */
  hasATag (annotation, tag) {
    return _.findIndex(annotation.tags, (annotationTag) => {
      return _.startsWith(annotationTag.toLowerCase(), tag.toLowerCase())
    }) !== -1
  }

  /**
   * This function gives a color to each codebook element
   */
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

  /**
   * This function creates the themes right click context menu.
   */
  themeRightClickHandler () {
    return (themeId) => {
      let items = {}
      // PVSCL:IFCOND(CodebookUpdate, LINE)
      // PVSCL:IFCOND(Hierarchy, LINE)
      items['createNewCode'] = {name: 'Create new code'}
      // PVSCL:ENDCOND
      items['updateTheme'] = {name: 'Modify theme'}
      items['removeTheme'] = {name: 'Remove theme'}
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(SidebarNavigation, LINE)
      // TODO Implement page annotation and uncomment this:
      // items['pageAnnotation'] = {name: 'Page annotation'}
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
          if (key === 'updateTheme') {
            let theme = this.codebook.getCodeOrThemeFromId(themeId)
            LanguageUtils.dispatchCustomEvent(Events.updateTheme, {theme: theme})
          }
          if (key === 'removeTheme') {
            let theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              LanguageUtils.dispatchCustomEvent(Events.removeTheme, {theme: theme})
            }
          }
          // PVSCL:ENDCOND
          // PVSCL:IFCOND(SidebarNavigation, LINE)
          if (key === 'pageAnnotation') {
            Alerts.infoAlert({text: 'If sidebar navigation is active, it is not possible to make page level annotations yet.'})
            // TODO Page level annotations, take into account that tags are necessary here (take into account Moodle related case)
            /* let theme = this.codebook.getCodeOrThemeFromId(themeId)
            LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
              purpose: 'classifying',
              theme: theme,
              codeId: theme.id
            }) */
          }
          // PVSCL:ENDCOND
        },
        items: items
      }
    }
  }
  // PVSCL:IFCOND(Hierarchy, LINE)

  /**
   * This function creates the codes right click context menu.
   */
  codeRightClickHandler () {
    return (codeId) => {
      // Get code from id
      let code = this.codebook.getCodeOrThemeFromId(codeId)
      if (LanguageUtils.isInstanceOf(code, Code)) {
        let items = {}
        // PVSCL:IFCOND(CodebookUpdate, LINE)
        items['updateCode'] = {name: 'Modify code'}
        items['removeCode'] = {name: 'Remove code'}
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(SidebarNavigation, LINE)
        // items['pageAnnotation'] = {name: 'Page annotation'}
        // PVSCL:ENDCOND
        return {
          callback: (key) => {
            // PVSCL:IFCOND(CodebookUpdate, LINE)
            if (key === 'removeCode') {
              LanguageUtils.dispatchCustomEvent(Events.removeCode, {code: code})
            }
            if (key === 'updateCode') {
              LanguageUtils.dispatchCustomEvent(Events.updateCode, {code: code})
            }
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(SidebarNavigation, LINE)
            // TODO Page level annotations, take into account that tags are necessary here (take into account Moodle related case)
            if (key === 'pageAnnotation') {
              Alerts.infoAlert({text: 'If sidebar navigation is active, it is not possible to make page level annotations yet.'})
              /* let theme = this.codebook.getCodeOrThemeFromId(codeId)
              LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                purpose: 'classifying',
                theme: theme,
                codeId: theme.id
              }) */
            }
            // PVSCL:ENDCOND
          },
          items: items
        }
      }
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(CodebookUpdate, LINE)

  /**
   * This function stores the new theme in the codebook and reloads the button container.
   */
  themeCreatedEventHandler () {
    return (event) => {
      let theme = Theme.fromAnnotation(event.detail.newThemeAnnotation, this.codebook)
      // Add to the model the new theme
      this.codebook.addTheme(theme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, {codebook: this.codebook})
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  themeUpdatedEventHandler () {
    return (event) => {
      // Update model
      this.codebook.updateTheme(event.detail.updatedTheme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, {codebook: this.codebook})
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  /**
   * This function removes the given theme from the codebook and reloads the button container.
   */
  themeRemovedEventHandler () {
    return (event) => {
      let theme = event.detail.theme
      theme.annotationGuide.removeTheme(theme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, {codebook: this.codebook})
    }
  }

  /**
   * This function stores the new code in the codebook and reloads the button container.
   */
  // PVSCL:IFCOND(Hierarchy, LINE)
  codeCreatedEventHandler () {
    return (event) => {
      let theme = event.detail.theme
      let code = Code.fromAnnotation(event.detail.newCodeAnnotation, theme)
      // Add to the model the new theme
      theme.addCode(code)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, {codebook: this.codebook})
      // Reopen sidebar to see the new added code
      window.abwa.sidebar.openSidebar()
    }
  }

  codeUpdatedEventHandler () {
    return (event) => {
      // Update model
      let code = event.detail.updatedCode
      let theme = code.theme
      theme.updateCode(code)
      this.codebook.updateTheme(theme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, {codebook: this.codebook})
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  /**
   * This function removes the given code from the codebook and reloads the button container.
   */
  codeRemovedEventHandler () {
    return (event) => {
      let code = event.detail.code
      code.theme.removeCode(code)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, {codebook: this.codebook})
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND
  codebookCreatedEventHandler () {
    return () => {
      this.initCodebookContent()
    }
  }
}

module.exports = ReadCodebook
