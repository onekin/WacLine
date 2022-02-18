import Events from '../Events'
import _ from 'lodash'
import LanguageUtils from '../utils/LanguageUtils'
import Alerts from '../utils/Alerts'
// PVSCL:IFCOND(Linking, LINE)
import Linking from './purposes/linking/Linking'
// PVSCL:ENDCOND

class DeleteAnnotation {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for createAnnotation event
    this.initDeleteAnnotationEvent()
    // PVSCL:IFCOND(DeleteAll, LINE)
    // Add event listener for deleteAllAnnotations event
    this.initDeleteAllAnnotationsEvent()
    // PVSCL:ENDCOND
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  initDeleteAnnotationEvent (callback) {
    this.events.deleteAnnotationEvent = { element: document, event: Events.deleteAnnotation, handler: this.deleteAnnotationEventHandler() }
    this.events.deleteAnnotationEvent.element.addEventListener(this.events.deleteAnnotationEvent.event, this.events.deleteAnnotationEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }
  // PVSCL:IFCOND(DeleteAll, LINE)

  initDeleteAllAnnotationsEvent (callback) {
    this.events.deleteAllAnnotationEvent = { element: document, event: Events.deleteAllAnnotations, handler: this.deleteAllAnnotationsEventHandler() }
    this.events.deleteAllAnnotationEvent.element.addEventListener(this.events.deleteAllAnnotationEvent.event, this.events.deleteAllAnnotationEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  deleteAllAnnotationsEventHandler () {
    return () => {
      // Retrieve all the annotations
      const allAnnotations = window.abwa.annotationManagement.annotationReader.allAnnotations
      // Filter by current user's annotations, as other users are not deleteable
      const annotationsToDelete = allAnnotations.filter(annotation => {
        return annotation.creator === window.abwa.groupSelector.getCreatorData()
      })
      window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err) => {
        if (err) {
          Alerts.errorAlert({ text: 'Unable to delete all the annotations in the document. Please try it again.' })
        } else {
          LanguageUtils.dispatchCustomEvent(Events.deletedAllAnnotations, { annotations: annotationsToDelete })
        }
      })
    }
  }
  // PVSCL:ENDCOND

  deleteAnnotationEventHandler () {
    return (event) => {
      // Get annotation to delete
      const annotation = event.detail.annotation
      // Ask for confirmation
      Alerts.confirmAlert({
        alertType: Alerts.alertType.question,
        title: 'Delete annotation',
        text: 'Are you sure you want to delete this annotation?',
        callback: () => {
          // PVSCL:IFCOND(Linking, LINE)
          if (annotation.body) {
            let linkingBody = annotation.getBodyForPurpose(Linking.purpose)
            if (linkingBody) {
              let fromTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(linkingBody.value.from)
              let toTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(linkingBody.value.to)
              let linkingWord = linkingBody.value.linkingWord
              // How many annotations?
              let relation = window.abwa.mapContentManager.findRelationship(fromTheme, toTheme, linkingWord)
              Alerts.confirmAlert({
                alertType: Alerts.alertType.question,
                title: 'Delete relationship',
                text: 'Do you want to remove the following link?' + '\n' + fromTheme.name + ' -> ' + linkingWord + ' -> ' + toTheme.name,
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
                callback: () => {
                  // Delete all the relationship annotations
                  let linkingsId = _.map(relation.evidenceAnnotations, (annotation) => { return annotation.id })
                  window.abwa.annotationServerManager.client.deleteAnnotations(linkingsId, (err, result) => {
                    if (err) {
                      Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
                    } else {
                      LanguageUtils.dispatchCustomEvent(Events.annotationsDeleted, { annotations: relation.evidenceAnnotations })
                      LanguageUtils.dispatchCustomEvent(Events.linkAnnotationDeleted, { relation: relation })
                    }
                  })
                },
                cancelCallback: () => {
                  if (relation.evidenceAnnotations.length > 1) {
                    // If more than one relationship annotation, delete only the selected annotation
                    window.abwa.annotationServerManager.client.deleteAnnotation(annotation.id, (err, result) => {
                      if (err) {
                        // Unable to delete this annotation
                        console.error('Error while trying to delete annotation %s', annotation.id)
                      } else {
                        if (!result.deleted) {
                          // Alert user error happened
                          Alerts.errorAlert({ text: chrome.i18n.getMessage('errorDeletingHypothesisAnnotation') })
                        } else {
                          // Send annotation deleted event
                          LanguageUtils.dispatchCustomEvent(Events.annotationDeleted, { annotation: annotation })
                          LanguageUtils.dispatchCustomEvent(Events.linkAnnotationDeleted, { relation: relation })
                        }
                      }
                    })
                  } else {
                    // If there is only one annotation, save the relationship in another one without target
                    let target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
                    annotation.target = target
                    LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, { annotation: annotation })
                    LanguageUtils.dispatchCustomEvent(Events.linkAnnotationUpdated, { annotation: annotation })
                  }
                }
              })
            } else {
              // The annotation has not linking purpose
              // Delete annotation
              window.abwa.annotationServerManager.client.deleteAnnotation(annotation.id, (err, result) => {
                if (err) {
                  // Unable to delete this annotation
                  console.error('Error while trying to delete annotation %s', annotation.id)
                } else {
                  if (!result.deleted) {
                    // Alert user error happened
                    Alerts.errorAlert({ text: chrome.i18n.getMessage('errorDeletingHypothesisAnnotation') })
                  } else {
                    // Send annotation deleted event
                    LanguageUtils.dispatchCustomEvent(Events.annotationDeleted, { annotation: annotation })
                  }
                }
              })
            }
          }
          // PVSCL:ELSECOND
          // Delete annotation
          window.abwa.annotationServerManager.client.deleteAnnotation(annotation.id, (err, result) => {
            if (err) {
              // Unable to delete this annotation
              console.error('Error while trying to delete annotation %s', annotation.id)
            } else {
              if (!result.deleted) {
                // Alert user error happened
                Alerts.errorAlert({ text: chrome.i18n.getMessage('errorDeletingHypothesisAnnotation') })
              } else {
                // Send annotation deleted event
                LanguageUtils.dispatchCustomEvent(Events.annotationDeleted, { annotation: annotation })
              }
            }
          })
          // PVSCL:ENDCOND
        }
      })
    }
  }
}

export default DeleteAnnotation
