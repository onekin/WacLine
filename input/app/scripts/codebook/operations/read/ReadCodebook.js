import Events from '../../../Events'
import Config from '../../../Config'
import Buttons from './Buttons'
import Alerts from '../../../utils/Alerts'
import $ from 'jquery'
import _ from 'lodash'
import Codebook from '../../model/Codebook'
import Theme from '../../model/Theme'
// PVSCL:IFCOND(Hierarchy,LINE)
import Code from '../../model/Code'
// PVSCL:ENDCOND
// PVSCL:IFCOND(Linking,LINE)
import LinkingButton from '../../../annotationManagement/purposes/linking/LinkingButton'
// PVSCL:ENDCOND
import ColorUtils from '../../../utils/ColorUtils'
import LanguageUtils from '../../../utils/LanguageUtils'
// PVSCL:IFCOND(CodebookUpdate, LINE)
import UpdateCodebook from '../update/UpdateCodebook'
// PVSCL:IFCOND(Dimensions,LINE)
import Dimension from '../../model/Dimension'
// PVSCL:ENDCOND
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
    // PVSCL:IFCOND(Dimensions,LINE)
    this.initDimensionCreatedEvent()
    this.initDimensionUpdatedEvent()
    this.initDimensionRemovedEvent()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Hierarchy,LINE)
    this.initCodeCreatedEvent()
    this.initCodeUpdatedEvent()
    this.initCodeRemovedEvent()
    // PVSCL:ENDCOND
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Linking AND NOT(Hierarchy) ,LINE)
    this.initRelationshipsLoadedEvent()
    this.initRelationshipAddedEvent()
    this.initRelationshipDeletedEvent()
    // PVSCL:ENDCOND
    this.loadCodebook(() => {
      // Add event listener for codebook read event
      this.initCodebookCreatedEvent()
      this.initCodebookReadEvent(callback)
    })
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    // Remove buttons container
    $('#tagsWrapper').remove()
  }

  // EVENTS
  // PVSCL:IFCOND(Linking AND NOT(Hierarchy), LINE)

  initRelationshipsLoadedEvent () {
    this.events.relationshipsLoadedEvent = { element: document, event: Events.relationshipsLoaded, handler: this.relationshipsLoadedEventHandler() }
    this.events.relationshipsLoadedEvent.element.addEventListener(this.events.relationshipsLoadedEvent.event, this.events.relationshipsLoadedEvent.handler, false)
  }

  initRelationshipAddedEvent () {
    this.events.relationshipAddedEvent = { element: document, event: Events.relationshipAdded, handler: this.relationshipAddedEventHandler() }
    this.events.relationshipAddedEvent.element.addEventListener(this.events.relationshipAddedEvent.event, this.events.relationshipAddedEvent.handler, false)
  }

  initRelationshipDeletedEvent () {
    this.events.relationshipDeletedEvent = { element: document, event: Events.relationshipDeleted, handler: this.relationshipDeletedEventHandler() }
    this.events.relationshipDeletedEvent.element.addEventListener(this.events.relationshipDeletedEvent.event, this.events.relationshipDeletedEvent.handler, false)
  }
  // PVSCL:ENDCOND

  // PVSCL:IFCOND(CodebookUpdate,LINE)
  initThemeCreatedEvent () {
    this.events.themeCreatedEvent = { element: document, event: Events.themeCreated, handler: this.themeCreatedEventHandler() }
    this.events.themeCreatedEvent.element.addEventListener(this.events.themeCreatedEvent.event, this.events.themeCreatedEvent.handler, false)
  }

  initThemeUpdatedEvent () {
    this.events.themeUpdatedEvent = { element: document, event: Events.themeUpdated, handler: this.themeUpdatedEventHandler() }
    this.events.themeUpdatedEvent.element.addEventListener(this.events.themeUpdatedEvent.event, this.events.themeUpdatedEvent.handler, false)
  }

  initThemeRemovedEvent () {
    this.events.themeRemovedEvent = { element: document, event: Events.themeRemoved, handler: this.themeRemovedEventHandler() }
    this.events.themeRemovedEvent.element.addEventListener(this.events.themeRemovedEvent.event, this.events.themeRemovedEvent.handler, false)
  }
  // PVSCL:IFCOND(Dimensions,LINE)

  initDimensionCreatedEvent () {
    this.events.dimensionCreatedEvent = { element: document, event: Events.dimensionCreated, handler: this.dimensionCreatedEventHandler() }
    this.events.dimensionCreatedEvent.element.addEventListener(this.events.dimensionCreatedEvent.event, this.events.dimensionCreatedEvent.handler, false)
  }

  initDimensionUpdatedEvent () {
    this.events.dimensionUpdatedEvent = { element: document, event: Events.dimensionUpdated, handler: this.dimensionUpdatedEventHandler() }
    this.events.dimensionUpdatedEvent.element.addEventListener(this.events.dimensionUpdatedEvent.event, this.events.dimensionUpdatedEvent.handler, false)
  }

  initDimensionRemovedEvent () {
    this.events.dimensionRemovedEvent = { element: document, event: Events.dimensionRemoved, handler: this.dimensionRemovedEventHandler() }
    this.events.dimensionRemovedEvent.element.addEventListener(this.events.dimensionRemovedEvent.event, this.events.dimensionRemovedEvent.handler, false)
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Hierarchy,LINE)

  initCodeCreatedEvent () {
    this.events.codeCreatedEvent = { element: document, event: Events.codeCreated, handler: this.codeCreatedEventHandler() }
    this.events.codeCreatedEvent.element.addEventListener(this.events.codeCreatedEvent.event, this.events.codeCreatedEvent.handler, false)
  }

  initCodeUpdatedEvent () {
    this.events.codeUpdatedEvent = { element: document, event: Events.codeUpdated, handler: this.codeUpdatedEventHandler() }
    this.events.codeUpdatedEvent.element.addEventListener(this.events.codeUpdatedEvent.event, this.events.codeUpdatedEvent.handler, false)
  }

  initCodeRemovedEvent () {
    this.events.codeRemovedEvent = { element: document, event: Events.codeRemoved, handler: this.codeRemovedEventHandler() }
    this.events.codeRemovedEvent.element.addEventListener(this.events.codeRemovedEvent.event, this.events.codeRemovedEvent.handler, false)
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND

  initCodebookReadEvent (callback) {
    this.events.codebookReadEvent = { element: document, event: Events.codebookRead, handler: this.codebookReadEventHandler() }
    this.events.codebookReadEvent.element.addEventListener(this.events.codebookReadEvent.event, this.events.codebookReadEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initCodebookCreatedEvent () {
    this.events.codebookCreatedEvent = { element: document, event: Events.codebookCreated, handler: this.codebookCreatedEventHandler() }
    this.events.codebookCreatedEvent.element.addEventListener(this.events.codebookCreatedEvent.event, this.events.codebookCreatedEvent.handler, false)
  }

  /**
   * Loads the codebook inside the sidebar
   * @param callback
   */
  loadCodebook (callback) {
    console.debug('Reading codebook')
    this.initCodebookStructure(() => {
      this.initCodebookContent(callback)
    })
  }

  /**
   * This function add the html associated to the codebook in the sidebar
   * @param callback
   */
  initCodebookStructure (callback) {
    const tagWrapperUrl = chrome.extension.getURL('pages/sidebar/tagWrapper.html')
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
        Alerts.errorAlert({ text: 'Unable to retrieve annotations from annotation server to initialize highlighter buttons.' }) // TODO i18n
      } else {
        const initCodebookPromise = new Promise((resolve, reject) => {
          if (codebookDefinitionAnnotations.length === 0) {
            // PVSCL:IFCOND(BuiltIn AND NOT(ApplicationBased), LINE)
            // PVSCL:IFCOND(TopicBased, LINE)
            const currentGroupFullName = window.abwa.groupSelector.groupFullName || ''
            // PVSCL:ELSECOND
            const currentGroupName = window.abwa.groupSelector.currentGroup.name || ''
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(TopicBased, LINE)
            LanguageUtils.dispatchCustomEvent(Events.createCodebook, { howCreate: 'topicBased', topic: currentGroupFullName })
            resolve()
            // PVSCL:ELSECOND
            // PVSCL:IFCOND(CodebookUpdate, LINE)
            // As codebook can be updated, the user can create an empty one and update it later
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
                LanguageUtils.dispatchCustomEvent(Events.createCodebook, { howCreate: 'builtIn' })
                resolve()
              },
              cancelCallback: () => {
                // PVSCL:IFCOND(CodebookUpdate,LINE)
                LanguageUtils.dispatchCustomEvent(Events.createCodebook, { howCreate: 'emptyCodebook' })
                // PVSCL:ENDCOND
                resolve()
              }
            })
            // PVSCL:ENDCOND
            // PVSCL:ELSECOND
            // If codebook is not updateable, it is necessary to create the default one, as otherwise the user can select empty codebook and get an unusable configuration
            LanguageUtils.dispatchCustomEvent(Events.createCodebook, { howCreate: 'builtIn' })
            resolve()
            // PVSCL:ENDCOND
            // PVSCL:ELSEIFCOND(ApplicationBased, LINE)
            LanguageUtils.dispatchCustomEvent(Events.createCodebook, { howCreate: 'builtIn' })
            resolve()
            // PVSCL:ELSEIFCOND(NOT(Codebook))
            LanguageUtils.dispatchCustomEvent(Events.createCodebook, { howCreate: 'noCodebook' }) // The parameter howCreate is not really necessary in current implementation
            resolve()
            // PVSCL:ELSECOND
            // Show alert no group is defined
            Alerts.errorAlert({ text: 'No group is defined' })
            // PVSCL:ENDCOND
          } else {
            Codebook.fromAnnotations(codebookDefinitionAnnotations, (err, codebook) => {
              if (err) {
                Alerts.errorAlert({ text: 'Error parsing codebook. Error: ' + err.message })
              } else {
                this.codebook = codebook
                this.renderCodebookInSidebar()
                resolve()
              }
            })
          }
        })
        initCodebookPromise.then(() => {
          if (_.isFunction(callback)) {
            callback()
          }
        })
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
        Alerts.errorAlert({ text: 'Unable to construct the highlighter. Please reload webpage and try it again.' })
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
        const cmid = window.abwa.targetManager.fileMetadata.cmid
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
      // Get the codebook
      this.codebook = event.detail.codebook
      this.renderCodebookInSidebar()
    }
  }

  renderCodebookInSidebar () {
    // Remove buttons from previous codebook if exists
    this.buttonContainer.innerText = ''
    // PVSCL:IFCOND(Codebook, LINE)
    // Set colors for each element
    // PVSCL:IFCOND(Dimensions, LINE)
    this.applyColorsToDimensions()
    // PVSCL:ELSECOND
    this.applyColorsToThemes()
    // PVSCL:ENDCOND
    // PVSCL:ENDCOND
    // Populate sidebar buttons container
    this.createButtons()
  }

  // PVSCL:IFCOND(Dimensions, LINE)
  /**
   * This function adds the buttons that must appear in the sidebar to be able to annotate
   */
  createButtons () {
    // PVSCL:IFCOND(CodebookUpdate, LINE)
    // PVSCL:IFCOND(Dimensions, LINE)
    // Create new theme button
    UpdateCodebook.createNewDimensionButton()
    // PVSCL:ELSECOND
    // Create new theme button
    UpdateCodebook.createNewThemeButton()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Linking, LINE)
    // Create new relation button
    LinkingButton.createNewLinkButton()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(TopicBased, LINE)
    const rootTheme = this.getTopicTheme()
    // PVSCL:ENDCOND
    let themeButtonContainer
    // PVSCL:IFCOND(TopicBased,LINE)
    if (rootTheme) {
      themeButtonContainer = this.createThemeButtonContainer(rootTheme)
      if (_.isElement(themeButtonContainer)) {
        this.buttonContainer.append(themeButtonContainer)
      }
    }
    // PVSCL:ENDCOND
    this.codebook.dimensions.forEach((dimension) => {
      // PVSCL:IFCOND(CodebookUpdate, LINE)
      // Create new theme button
      UpdateCodebook.createNewThemeButton(dimension.name)
      // PVSCL:ENDCOND
      let themes = this.codebook.themes.filter((theme) => {
        return theme.dimension === dimension.name
      })
      themes.sort((a, b) => a.name.localeCompare(b.name))
      for (let i = 0; i < themes.length; i++) {
        const theme = themes[i]
        themeButtonContainer = this.createThemeButtonContainer(theme)
        if (_.isElement(themeButtonContainer)) {
          this.buttonContainer.append(themeButtonContainer)
        }
      }
    })
    let undefindedThemes = this.codebook.themes.filter((theme) => {
      return !theme.dimension
    })
    for (let i = 0; i < undefindedThemes.length; i++) {
      const theme = undefindedThemes[i]
      themeButtonContainer = this.createThemeButtonContainer(theme)
      if (_.isElement(themeButtonContainer)) {
        this.buttonContainer.append(themeButtonContainer)
      }
    }
  }
  // PVSCL:ELSECOND

  createButtons () {
    // PVSCL:IFCOND(CodebookUpdate, LINE)
    // Create new theme button
    UpdateCodebook.createNewThemeButton()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Linking, LINE)
    LinkingButton.createNewLinkButton()
    // PVSCL:ENDCOND
    // Create new relation button
    // Create current buttons
    let themes
    // PVSCL:IFCOND(TopicBased, LINE)
    const rootTheme = this.getTopicTheme()
    themes = this.filterTopicTheme()
    // PVSCL:ELSECOND
    themes = this.codebook.themes
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Alphabetical, LINE)
    themes.sort((a, b) => a.name.localeCompare(b.name))
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Number, LINE)
    themes.sort((a, b) => parseFloat(a.name) - parseFloat(b.name))
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Date, LINE)
    themes.sort((a, b) => a.createdDate - b.createdDate)
    // PVSCL:ENDCOND
    let themeButtonContainer
    // PVSCL:IFCOND(TopicBased,LINE)
    if (rootTheme) {
      themeButtonContainer = this.createThemeButtonContainer(rootTheme)
      if (_.isElement(themeButtonContainer)) {
        this.buttonContainer.append(themeButtonContainer)
      }
    }
    // PVSCL:ENDCOND
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i]
      // PVSCL:IFCOND(Hierarchy,LINE)
      let codes = theme.codes
      codes = codes.sort((a, b) => {
        let result
        // PVSCL:IFCOND(Alphabetical, LINE)
        result = a.name.localeCompare(b.name)
        // PVSCL:ELSEIFCOND(Number, LINE)
        result = parseFloat(a.name) > parseFloat(b.name)
        // PVSCL:ELSEIFCOND(Date, LINE)
        // PVSCL:ENDCOND
        return result
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
  // PVSCL:ENDCOND

  createGroupedThemeButtonContainer (theme, codes) {
    return Buttons.createGroupedButtons({
      id: theme.id,
      name: theme.name,
      className: 'codingElement',
      description: theme.description,
      color: theme.color,
      childGuideElements: codes,
      groupHandler: (event) => {
        const themeId = event.target.parentElement.parentElement.dataset.codeId
        if (themeId) {
          const theme = this.codebook.getCodeOrThemeFromId(themeId)
          if (LanguageUtils.isInstanceOf(theme, Theme)) {
            let id = ''
            let tags = ''
            // PVSCL:IFCOND(NOT(Multivalued),LINE)
            // First, ask for the currently annotated code
            const currentlyAnnotatedCode = window.abwa.annotatedContentManager.searchAnnotatedCodeForGivenThemeId(themeId)
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
        const codeId = event.target.dataset.codeId
        if (codeId) {
          const code = this.codebook.getCodeOrThemeFromId(codeId)
          if (!LanguageUtils.isInstanceOf(code, Theme)) {
            // PVSCL:IFCOND(NOT(Multivalued),LINE)
            // The rest of the annotations must be classified with this code too
            // Get the annotatedTheme object of the code selected
            const annotatedTheme = window.abwa.annotatedContentManager.getAnnotatedThemeOrCodeFromThemeOrCodeId(code.theme.id)
            // retrive the annotatedTheme object of the code selected
            const currentlyAnnotatedCode = window.abwa.annotatedContentManager.searchAnnotatedCodeForGivenThemeId(code.theme.id)
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
              const tags = [Config.namespace + ':' + Config.tags.grouped.relation + ':' + code.theme.name, Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + code.name]
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
            const tags = [Config.namespace + ':' + Config.tags.grouped.relation + ':' + code.theme.name, Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + code.name]
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
        const themeId = event.target.dataset.codeId
        if (themeId) {
          const theme = this.codebook.getCodeOrThemeFromId(themeId)
          if (LanguageUtils.isInstanceOf(theme, Theme)) {
            const tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name]
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

  // PVSCL:IFCOND(Dimensions,LINE)

  /**
   * This function gives a color to each codebook element
   */
  applyColorsToDimensions () {
    if (this.codebook && this.codebook.dimensions) {
      // const listOfColors = ColorUtils.getDifferentColors(this.codebook.dimensions.length + 1)
      let topic = this.codebook.themes.filter((theme) => {
        return theme.isTopic === true
      })
      if (topic) {
        topic[0].color = ColorUtils.getTopicColor()
      }
      this.codebook.dimensions.forEach((dimension) => {
        // const color = listOfColors.pop()
        // Set a color for each theme
        let themesPerDimension = this.codebook.themes.filter((theme) => {
          return theme.dimension === dimension.name
        })
        // Set color gradient for each code
        if (themesPerDimension) {
          themesPerDimension.forEach((theme) => {
            theme.color = ColorUtils.setAlphaToColor(dimension.color, 0.5)
          })
        }
      })
    }
  }
  // PVSCL:ELSECOND
  /**
   * This function gives a color to each codebook element
   */
  applyColorsToThemes () {
    if (this.codebook && this.codebook.themes) {
      const listOfColors = ColorUtils.getDifferentColors(this.codebook.themes.length)
      this.codebook.themes.forEach((theme) => {
        const color = listOfColors.pop()
        // PVSCL:IFCOND(Hierarchy,LINE)
        // Set a color for each theme
        theme.color = ColorUtils.setAlphaToColor(color, Config.colors.minAlpha)
        // Set color gradient for each code
        const numberOfCodes = theme.codes.length
        theme.codes.forEach((code, j) => {
          const alphaForChild = (Config.colors.maxAlpha - Config.colors.minAlpha) / numberOfCodes * (j + 1) + Config.colors.minAlpha
          code.color = ColorUtils.setAlphaToColor(color, alphaForChild)
        })
        // PVSCL:ELSECOND
        theme.color = ColorUtils.setAlphaToColor(color, 0.5)
        // PVSCL:ENDCOND
      })
    }
  }
  // PVSCL:ENDCOND

  /**
   * This function creates the themes right click context menu.
   */
  themeRightClickHandler () {
    return (themeId) => {
      const items = {}
      // PVSCL:IFCOND(CodebookUpdate, LINE)
      // PVSCL:IFCOND(Hierarchy, LINE)
      items.createNewCode = { name: 'Create new code' }
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(TopicBased, LINE)
      let theme = this.codebook.getCodeOrThemeFromId(themeId)
      if (!theme.isTopic) {
        items.updateTheme = { name: 'Rename ' + Config.tags.grouped.group }
        items.removeTheme = { name: 'Remove ' + Config.tags.grouped.group }
        // PVSCL:IFCOND(Linking,LINE)
        items.manageRelationships = { name: 'Manage links' }
        items.showAnnotations = { name: 'Show annotations' }
        // PVSCL:ENDCOND
      } else {
        items.updateTheme = { name: 'Rename topic' }
        // PVSCL:IFCOND(Linking,LINE)
        items.manageRelationships = { name: 'Manage links' }
        items.showAnnotations = { name: 'Show annotations' }
        // PVSCL:ENDCOND
      }
      // PVSCL:ELSECOND
      items.updateTheme = { name: 'Rename ' + Config.tags.grouped.group }
      items.removeTheme = { name: 'Remove ' + Config.tags.grouped.group }
      // PVSCL:IFCOND(Linking,LINE)
      items.manageRelationships = { name: 'Manage links' }
      items.showAnnotations = { name: 'Show annotations' }
      // PVSCL:ENDCOND
      // PVSCL:ENDCOND
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
            const theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              LanguageUtils.dispatchCustomEvent(Events.createCode, { theme: theme })
            }
          }
          // PVSCL:ENDCOND
          if (key === 'updateTheme') {
            const theme = this.codebook.getCodeOrThemeFromId(themeId)
            LanguageUtils.dispatchCustomEvent(Events.updateTheme, { theme: theme })
          }
          if (key === 'removeTheme') {
            const theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              LanguageUtils.dispatchCustomEvent(Events.removeTheme, { theme: theme })
            }
          }
          // PVSCL:IFCOND(Linking, LINE)
          if (key === 'manageRelationships') {
            let theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              window.abwa.mapContentManager.manageRelationships(theme)
            }
          }
          if (key === 'showAnnotations') {
            let theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              window.abwa.annotationServerManager.client.getUserProfile((err, userProfile) => {
                if (err) {
                  console.error('Error while retrieving user profile in hypothesis')
                } else {
                  console.log(userProfile)
                  let groupId = window.abwa.groupSelector.currentGroup.id
                  let groupName = window.abwa.groupSelector.currentGroup.name.toLowerCase().replace(/ /g, '-')
                  let query = '?q=tag:' + Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name.replace(/ /g, '+')
                  let url = 'https://hypothes.is/groups/' + groupId + '/' + groupName + query
                  console.log(url)
                  window.open(url)
                }
              })
            }
          }
          // PVSCL:ENDCOND
          // PVSCL:ENDCOND
          // PVSCL:IFCOND(SidebarNavigation, LINE)
          if (key === 'pageAnnotation') {
            Alerts.infoAlert({ text: 'If sidebar navigation is active, it is not possible to make page level annotations yet.' })
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
      const code = this.codebook.getCodeOrThemeFromId(codeId)
      if (LanguageUtils.isInstanceOf(code, Code)) {
        const items = {}
        // PVSCL:IFCOND(CodebookUpdate, LINE)
        items.updateCode = { name: 'Modify code' }
        items.removeCode = { name: 'Remove code' }
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(SidebarNavigation, LINE)
        // items['pageAnnotation'] = {name: 'Page annotation'}
        // PVSCL:ENDCOND
        return {
          callback: (key) => {
            // PVSCL:IFCOND(CodebookUpdate, LINE)
            if (key === 'removeCode') {
              LanguageUtils.dispatchCustomEvent(Events.removeCode, { code: code })
            }
            if (key === 'updateCode') {
              LanguageUtils.dispatchCustomEvent(Events.updateCode, { code: code })
            }
            // PVSCL:ENDCOND
            // PVSCL:IFCOND(SidebarNavigation, LINE)
            // TODO Page level annotations, take into account that tags are necessary here (take into account Moodle related case)
            if (key === 'pageAnnotation') {
              Alerts.infoAlert({ text: 'If sidebar navigation is active, it is not possible to make page level annotations yet.' })
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
  // PVSCL:IFCOND(Dimensions, LINE)
  /**
   * This function stores the new theme in the codebook and reloads the button container.
   */
  dimensionCreatedEventHandler () {
    return (event) => {
      const dimension = Dimension.fromAnnotation(event.detail.newDimensionAnnotation, this.codebook)
      // Add to the model the new theme
      this.codebook.addDimension(dimension)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  dimensionUpdatedEventHandler () {
    return (event) => {
      // Update model
      this.codebook.updateTheme(event.detail.updatedTheme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  /**
   * This function removes the given theme from the codebook and reloads the button container.
   */
  dimensionRemovedEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      theme.annotationGuide.removeTheme(theme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
    }
  }
  // PVSCL:ENDCOND

  /**
   * This function stores the new theme in the codebook and reloads the button container.
   */
  themeCreatedEventHandler () {
    return (event) => {
      const theme = Theme.fromAnnotation(event.detail.newThemeAnnotation, this.codebook)
      // Add to the model the new theme
      this.codebook.addTheme(theme)
      // Create theme annotation
      LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
        purpose: 'classifying',
        target: event.detail.target,
        codeId: theme.id/* PVSCL:IFCOND(EvidenceAnnotations) */,
        addToCXL: true /* PVSCL:ENDCOND */
      })
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
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
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  /**
   * This function removes the given theme from the codebook and reloads the button container.
   */
  themeRemovedEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      theme.annotationGuide.removeTheme(theme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
    }
  }

  // PVSCL:IFCOND(Hierarchy, LINE)

  /**
   * This function stores the new code in the codebook and reloads the button container.
   */
  codeCreatedEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      const code = Code.fromAnnotation(event.detail.newCodeAnnotation, theme)
      // Add to the model the new theme
      theme.addCode(code)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
      // Reopen sidebar to see the new added code
      window.abwa.sidebar.openSidebar()
    }
  }

  codeUpdatedEventHandler () {
    return (event) => {
      // Update model
      const code = event.detail.updatedCode
      const theme = code.theme
      theme.updateCode(code)
      this.codebook.updateTheme(theme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  /**
   * This function removes the given code from the codebook and reloads the button container.
   */
  codeRemovedEventHandler () {
    return (event) => {
      const code = event.detail.code
      code.theme.removeCode(code)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND

  /**
   * Creates event handler for event CodebookCreated
   * @returns {function(...[*]=)}
   */
  codebookCreatedEventHandler () {
    return () => {
      this.buttonContainer.innerHTML = ''
      this.initCodebookContent()
    }
  }
  // PVSCL:IFCOND(Linking AND NOT(Hierarchy), LINE)

  relationshipsLoadedEventHandler () {
    return () => {
      let relations = window.abwa.mapContentManager.relationships
      for (let i = 0; i < relations.length; i++) {
        let relation = relations[i]
        // Get button
        let themeButton = document.querySelectorAll('.tagButton[data-code-id="' + relation.fromConcept.id + '"]')
        // Add relation to tooltip
        if (themeButton[0].title.includes('Relationships:')) {
          themeButton[0].title += '\n' + relation.linkingWord + ' ' + relation.toConcept.name
        } else {
          themeButton[0].title += '\nRelationships:\n' + relation.linkingWord + ' ' + relation.toConcept.name
        }
      }
    }
  }

  relationshipAddedEventHandler () {
    return (event) => {
      let relation = event.detail.relation
      let themeButton = document.querySelectorAll('.tagButton[data-code-id="' + relation.fromConcept.id + '"]')
      // Add relation to tooltip
      if (themeButton[0].title.includes('Relationships:')) {
        themeButton[0].title += '\n' + relation.linkingWord + ' ' + relation.toConcept.name
      } else {
        themeButton[0].title += '\nRelationships:\n' + relation.linkingWord + ' ' + relation.toConcept.name
      }
    }
  }

  relationshipDeletedEventHandler () {
    return (event) => {
      let relation = event.detail.relation
      let themeButton = document.querySelectorAll('.tagButton[data-code-id="' + relation.fromConcept.id + '"]')
      // Add relation to tooltip
      if (themeButton[0].title.includes('Relationships:')) {
        themeButton[0].title = themeButton[0].title.replace('\n' + relation.linkingWord + ' ' + relation.toConcept.name, '')
      }
      if (((themeButton[0].title.match(/\n/g)) || []).length === 1) {
        themeButton[0].title = themeButton[0].title.replace('\nRelationships:', '')
      }
    }
  }
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(TopicBased, LINE)

  getTopicTheme () {
    let themes = this.codebook.themes
    return _.find(themes, (theme) => { return theme.isTopic === true })
  }

  // PVSCL:IFCOND(NOT(Dimensions), LINE)
  filterTopicTheme () {
    let themes = this.codebook.themes
    return themes.filter((theme) => { return theme.isTopic === false })
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND
}

export default ReadCodebook
