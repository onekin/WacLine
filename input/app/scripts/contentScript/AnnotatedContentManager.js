const Events = require('./Events')
// const AnnotationUtils = require('../utils/AnnotationUtils')
// const Alerts = require('../utils/Alerts')
const LanguageUtils = require('../utils/LanguageUtils')
const Theme = require('../definition/Theme')
const _ = require('lodash')

class AnnotatedTheme {
  constructor ({theme = nullPVSCL:IFCOND(Code), annotatedCodes = []PVSCL:ENDCOND, annotations = []}) {
    // code
    this.theme = theme
    // PVSCL:IFCOND(Code, LINE)
    this.annotatedCodes = annotatedCodes
    // PVSCL:ENDCOND
    this.annotations = annotations
  }
}
//PVSCL:IFCOND(Code, LINE)

class AnnotatedCode {
  constructor ({code = null, annotations = []}) {
    this.code = code
    this.annotations = annotations
  }
}
//PVSCL:ENDCOND

class AnnotatedContentManager {
  constructor () {
    this.annotatedThemes = {}
    this.events = {}
    // PVSCL:IFCOND(MoodleURL, LINE)
    this.cmid = window.abwa.tagManager.model.highlighterDefinition.cmid
    // PVSCL:ENDCOND
  }

  init (callback) {
    console.debug('Initializing AnnotatedContentManager')
    // Retrieve all the annotations for this assignment
    this.updateAnnotationForAssignment(() => {
      this.reloadTagsChosen()
      console.debug('Initialized AnnotatedContentManager')
      if (_.isFunction(callback)) {
        callback()
      }
    })
    // Init event handlers
    this.initEvents()
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  updateAnnotationForAssignment (callback) {
    // Retrieve all the annotations for this assignment
    this.retrieveAnnotationsForAssignment((err, assignmentAnnotations) => {
      if (err) {
        // TODO Unable to retrieve annotations for this assignment
      } else {
        // Retrieve current annotatedThemes
        this.addingCodingsFromAnnotations(assignmentAnnotations)
        console.debug('Updated annotations for assignment')
        // Callback
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  retrieveAnnotationsForAssignment (callback) {
    let promise
    // PVSCL:IFCOND(MoodleURL, LINE)
    promise = new Promise((resolve, reject) => {
      let call = {}
      // Set the annotation group where annotations should be searched from
      call['group'] = window.abwa.groupSelector.currentGroup.id
      call['tags'] = 'cmid:' + this.cmid
      call['wildcard_uri'] = window.abwa.tagManager.model.highlighterDefinition.moodleEndpoint + '*'
      if (window.abwa.groupSelector.currentGroup.id) {
        window.abwa.storageManager.client.searchAnnotations(call, (err, annotations) => {
          if (err) {
            reject(err)
          } else {
            resolve(annotations)
          }
        })
      }
    })
    // PVSCL:ELSECOND
    promise = new Promise((resolve, reject) => {
      resolve(window.abwa.contentAnnotator.allAnnotations)
    })
    // PVSCL:ENDCOND
    // Return retrieved annotations
    promise.catch((err) => {
      callback(err)
    }).then((annotations) => {
      callback(null, annotations)
    })
  }

  addingCodingsFromAnnotations (annotations) {
    let annotatedThemesWithoutAnnotations = this.defineStructure()
    for (let i = 0; i < annotations.length; i++) {
      let annotation = annotations[i]
      annotatedThemesWithoutAnnotations = this.addAnnotationToAnnotatedThemesOrCode(annotation, annotatedThemesWithoutAnnotations)
    }
    this.annotatedThemes = annotatedThemesWithoutAnnotations
  }

  defineStructure () {
    // PVSCL:IFCOND(Code, LINE)
    let annotatedThemesStructure = _.map(window.abwa.tagManager.model.highlighterDefinition.themes, (theme) => {
      let codes = _.map(theme.codes, (code) => {
        return new AnnotatedCode({code: code})
      })
      return new AnnotatedTheme({theme: theme, annotatedCodes: codes})
    })
    // PVSCL:ELSECOND
    let annotatedThemesStructure = _.map(window.abwa.tagManager.model.highlighterDefinition.themes, (theme) => {
      return new AnnotatedTheme({theme: theme})
    })
    // PVSCL:ENDCOND
    return annotatedThemesStructure
  }

  /* codeToAll (level) {
    // Update marks
    this.updateAnnotationForAssignment(() => {
      let criteria = level.criteria
      // Get mark with annotations
      let mark = this.marks[criteria.name]
      // Get new tag list
      let newTagList = [
        'exam:isCriteriaOf:' + criteria.name,
        'exam:mark:' + level.name,
        'exam:cmid:' + this.cmid
      ]
      // Get annotations
      let annotations = mark.annotations
      if (annotations.length === 0) {
        // Ask user
        Alerts.confirmAlert({
          title: chrome.i18n.getMessage('noEvidencesFoundForMarkingTitle', criteria.name),
          text: chrome.i18n.getMessage('noEvidencesFoundForMarkingText', level.name),
          alertType: Alerts.alertType.warning,
          callback: (err) => {
            if (err) {
              // Manage error
              window.alert('Unable to create alert for: noEvidencesFoundForMarking. Reload the page, and if the error continues please contact administrator.')
            } else {
              const TextAnnotator = require('./contentAnnotators/TextAnnotator')
              window.abwa.hypothesisClientManager.hypothesisClient.createNewAnnotation(TextAnnotator.constructAnnotation(null, newTagList), (err, annotation) => {
                if (err) {
                  Alerts.errorAlert({text: err.message})
                } else {
                  mark.annotations = [annotation]
                  this.updateAnnotationsInHypothesis(annotations, () => {
                    window.abwa.contentAnnotator.updateAllAnnotations()
                  })
                  // Update moodle
                  this.updateMoodle(() => {
                    Alerts.temporalAlert({
                      text: 'The mark is updated in moodle',
                      title: 'Correctly marked',
                      type: Alerts.alertType.success,
                      toast: true
                    })
                  })
                }
              })
            }
          }
        })
      } else {
        // Update all annotations with new tags
        _.forEach(annotations, (annotation) => {
          annotation.tags = newTagList
        })
        this.updateAnnotationsInHypothesis(annotations, () => {
          window.abwa.contentAnnotator.updateAllAnnotations()
        })
        // Update moodle
        this.updateMoodle((err, result) => {
          if (err) {
            Alerts.errorAlert({
              text: 'Unable to push marks to moodle, please make sure that you are logged in Moodle and try it again.',
              title: 'Unable to update marks in moodle'
            })
          } else {
            Alerts.temporalAlert({
              text: 'The mark is updated in moodle',
              title: 'Correctly marked',
              type: Alerts.alertType.success,
              toast: true
            })
          }
        })
      }
      this.marks[criteria.name].level = level
      // this.reloadMarksChosen()
    })
  }

  updateAnnotationsInHypothesis (annotations, callback) {
    let promises = []
    for (let i = 0; i < annotations.length; i++) {
      let annotation = annotations[i]
      promises.push(new Promise((resolve, reject) => {
        window.abwa.hypothesisClientManager.hypothesisClient.updateAnnotation(annotation.id, annotation, (err, annotation) => {
          if (err) {
            reject(new Error('Unable to update annotation ' + annotation.id))
          } else {
            resolve(annotation)
          }
        })
      }))
    }
    let resultAnnotations = []
    Promise.all(promises).then((result) => {
      // All annotations updated
      resultAnnotations = result
    }).finally((result) => {
      if (_.isFunction(callback)) {
        callback(null, resultAnnotations)
      }
    })
  } */

  addAnnotationToAnnotatedThemesOrCode (annotation, annotatedThemesObject = this.annotatedThemes) {
    let annotatedThemeOrCode = this.getAnnotatedThemeOrCodeFromThemeOrCodeId(annotation.tagId, annotatedThemesObject)
    annotatedThemeOrCode.annotations.push(annotation)
    return annotatedThemesObject
  }

  removeAnnotationToAnnotatedThemesOrCode (annotation) {
    let annotatedThemeOrCode = this.getAnnotatedThemeOrCodeFromThemeOrCodeId(annotation.tagId)
    _.remove(annotatedThemeOrCode.annotations, annotation)
  }

  /**
   * This function returns the annotations done in current document for the given theme id or code id
   * @param themeOrCodeId
   * @returns {number}
   */
  getAnnotationsDoneWithThemeOrCodeId (themeOrCodeId) {
    // Get AnnotatedTheme or AnnotatedCode
    let themeOrCode = this.getAnnotatedThemeOrCodeFromThemeOrCodeId(themeOrCodeId)
    return _.filter(themeOrCode.annotations, (annotation) => {
      return annotation.uri === window.abwa.contentTypeManager.getDocumentURIToSave()
    })
  }

  /**
   * This function returns the AnnotatedTheme or AnnotatedCode for the given theme id or code id
   * @param themeOrCodeId
   * @param annotatedThemesObject
   */
  getAnnotatedThemeOrCodeFromThemeOrCodeId (themeOrCodeId, annotatedThemesObject = this.annotatedThemes) {
    let themeOrCode = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(themeOrCodeId)
    if (LanguageUtils.isInstanceOf(themeOrCode, Theme)) {
      // return annotationTheme with the codeId we need
      return _.find(annotatedThemesObject, (annotatedTheme) => {
        return annotatedTheme.theme.id === themeOrCode.id
      })
    } else {
      // return annotationCode with the codeId we need
      let annotatedTheme = _.find(annotatedThemesObject, (annotatedTheme) => {
        return annotatedTheme.theme.id === themeOrCode.theme.id
      })
      return _.find(annotatedTheme.annotatedCodes, (annotatedCode) => {
        return annotatedCode.code.id === themeOrCode.id
      })
    }
  }

  initEvents () {
    // Create event listener for updated all annotations
    this.events.annotationCreated = {element: document, event: Events.annotationCreated, handler: this.createAnnotationCreatedEventHandler()}
    this.events.annotationCreated.element.addEventListener(this.events.annotationCreated.event, this.events.annotationCreated.handler, false)

    // Create event listener for updated all annotations
    this.events.annotationDeleted = {element: document, event: Events.annotationDeleted, handler: this.createDeletedAnnotationEventHandler()}
    this.events.annotationDeleted.element.addEventListener(this.events.annotationDeleted.event, this.events.annotationDeleted.handler, false)

    // Create event listener for updated all annotations
    this.events.deletedAllAnnotations = {element: document, event: Events.deletedAllAnnotations, handler: this.createDeletedAllAnnotationsEventHandler()}
    this.events.deletedAllAnnotations.element.addEventListener(this.events.deletedAllAnnotations.event, this.events.deletedAllAnnotations.handler, false)

    // Event for tag manager reloaded
    /* document.addEventListener(Events.codeToAll, (event) => {
      // Get level for this mark
      let criteriaName = event.detail.criteriaName
      let markName = event.detail.levelName
      let level
      if (criteriaName && markName) {
        // Retrieve criteria from rubric
        let criteria = _.find(window.abwa.rubricManager.rubric.criterias, (criteria) => { return criteria.name === criteriaName })
        level = _.find(criteria.levels, (level) => { return level.name === markName })
        this.mark(level)
      } else {
        // Unable to retrieve criteria or level
        Alerts.errorAlert({title: 'Unable to mark', text: 'There was an error when trying to mark this assignment, please reload the page and try it again.' + chrome.i18n.getMessage('ContactAdministrator')})
      }
    })
    document.addEventListener(Events.comment, (event) => {
      // Retrieve annotation from event
      let annotation = event.detail.annotation
      // Retrieve criteria name for annotation
      let criteriaName = AnnotationUtils.getTagSubstringFromAnnotation(annotation, 'exam:isCriteriaOf:')
      // Find index in criteria annotations
      let mark = window.abwa.specific.assessmentManager.marks[criteriaName]
      if (mark && mark.annotations.length > 0) {
        let index = _.findIndex(mark.annotations, (annotationMark) => annotationMark.id === annotation.id)
        if (index > -1) {
          mark.annotations[index] = annotation
        }
        // Update moodle
        this.updateMoodle(() => {
          Alerts.temporalAlert({
            text: 'Comment updated in moodle',
            title: 'Moodle updated',
            type: Alerts.alertType.success,
            toast: true
          })
        })
      }
    }) */
  }

  createAnnotationCreatedEventHandler () {
    return (event) => {
      // Add event to the codings list
      if (event.detail.annotation) {
        let annotation = event.detail.annotation
        this.annotatedThemes = this.addAnnotationToAnnotatedThemesOrCode(annotation)
      }
      this.reloadTagsChosen()
    }
  }

  createDeletedAnnotationEventHandler () {
    return (event) => {
      if (event.detail.annotation) {
        let annotation = event.detail.annotation
        this.removeAnnotationToAnnotatedThemesOrCode(annotation)
      }
      this.reloadTagsChosen()
    }
  }

  createDeletedAllAnnotationsEventHandler () {
    return (event) => {
      if (event.detail.annotations) {
        let annotations = event.detail.annotations
        for (let i = 0; i < annotations.length; i++) {
          let annotation = annotations[i]
          this.removeAnnotationToAnnotatedThemesOrCode(annotation)
        }
      }
      this.reloadTagsChosen()
    }
  }

  /* updateMoodle (callback) {
    window.abwa.specific.moodleGradingManager.updateMoodleFromMarks(this.marks, callback)
  } */

  reloadTagsChosen () {
    // Retrieve annotated themes id
    for (let i = 0; i < this.annotatedThemes.length; i++) {
      // annotated
      let annotatedTheme = this.annotatedThemes[i]
      if (annotatedTheme.theme.codes && annotatedTheme.theme.codes.length > 0) {
        let annotatedGroupButton = document.querySelectorAll('.tagGroup[data-code-id="' + annotatedTheme.theme.id + '"]')
        let groupNameSpan = annotatedGroupButton[0].querySelector('.groupName')
        groupNameSpan.dataset.numberOfAnnotations = annotatedTheme.annotations.length
        //PVSCL:IFCOND(Code, LINE)
        for (let j = 0; j < annotatedTheme.annotatedCodes.length; j++) {
          let annotatedCode = annotatedTheme.annotatedCodes[j]
          let annotatedCodeButton = document.querySelectorAll('.tagButton[data-code-id="' + annotatedCode.code.id + '"]')
          annotatedCodeButton[0].dataset.numberOfAnnotations = annotatedCode.annotations.length
        }
        //PVSCL:ENDCOND
      } else {
        let annotatedThemeButton = document.querySelectorAll('.tagButton[data-code-id="' + annotatedTheme.theme.id + '"]')
        annotatedThemeButton[0].dataset.numberOfAnnotations = annotatedTheme.annotations.length
      }
    }
  }
}

module.exports = {AnnotatedContentManager, AnnotatedThemePVSCL:IFCOND(Code), AnnotatedCodePVSCL:ENDCOND}
