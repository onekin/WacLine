import MoodleEstimation from './MoodleEstimation'
import DateTimeUtils from '../utils/DateTimeUtils'
import axios from 'axios'
import _ from 'lodash'
import Events from '../Events'

class MoodleEstimationManager {
  constructor () {
    this.assignmentName = window.abwa.codebookManager.codebookReader.codebook.assignmentName
    this.cmid = window.abwa.codebookManager.codebookReader.codebook.cmid
  }

  init (callback) {
    this.initEventListeners(() => {
      this.calculateAndDisplayEstimation(callback)
    })
  }

  calculateAndDisplayEstimation (callback) {
    MoodleEstimation.retrieveAnnotationsForMarkAndGo(window.abwa.annotationServerManager, (err, annotationsPerGroup) => {
      if (err) {
        console.error('Unable to retrieve annotations of previous mark&go groups')
      } else {
        // Get number of students assignments submitted
        this.getNumberOfStudentsAssignmentsSubmitted((err, numberOfStudentsAssignmentsSubmitted) => {
          if (err) {
            console.error('Unable to retrieve number of students who submit their assignments.')
          } else {
            MoodleEstimation.estimateTimeInMilisecondsPendingToAssess({
              annotationsPerGroup, assignmentName: this.assignmentName, cmid: this.cmid, numberOfStudentsAssignmentsSubmitted
            }, (err, { numberOfAssessedCriteria, timeOfAssessedCriteria }) => {
              if (err) {
                console.error(err)
              } else {
                // Get number of total criterion to assess per student
                let timePerCriterion = timeOfAssessedCriteria / numberOfAssessedCriteria

                // Get pending assessment
                let doneCriterionNumber = _.compact(window.abwa.annotatedContentManager.annotatedThemes.map(annotatedTheme => annotatedTheme.annotatedCodes.find(code => code.annotations.length > 0))).length
                let pendingCriterionNumber = window.abwa.codebookManager.codebookReader.codebook.themes.length - doneCriterionNumber

                // Divide total estimated time by number of criteria
                let pendingTimeInMiliseconds = timePerCriterion * pendingCriterionNumber

                // Display extra time required to assess
                let estimatedTimeCounterElement = document.querySelector('#estimatedTimeCounter')
                let humanReadablePendingTime = DateTimeUtils.getHumanReadableTimeFromUnixTimeInMiliseconds(pendingTimeInMiliseconds)
                let result
                if (humanReadablePendingTime === 0) {
                  result = '- Assessed'
                } else if (_.isError(humanReadablePendingTime)) {
                  result = ''
                } else {
                  result = ' - ' + humanReadablePendingTime
                }
                if (_.isElement(estimatedTimeCounterElement)) {
                  estimatedTimeCounterElement.innerText = result
                } else {
                  document.querySelector('#toolsetHeader').innerHTML += '<span id="estimatedTimeCounter">' + result + '</span>'
                }
                if (_.isFunction(callback)) {
                  callback()
                }
              }
            })
          }
        })
      }
    })
  }

  initEventListeners (callback) {
    this.events = {}
    // Estimation time must be updated if it is detected a new annotation creation, modification (marked) or deletion
    // Created
    this.events.annotationCreatedEvent = { element: document, event: Events.annotationCreated, handler: this.createEstimationEventListener() }
    this.events.annotationCreatedEvent.element.addEventListener(this.events.annotationCreatedEvent.event, this.events.annotationCreatedEvent.handler, false)
    // Deleted
    this.events.annotationDeletedEvent = { element: document, event: Events.annotationDeleted, handler: this.createEstimationEventListener() }
    this.events.annotationDeletedEvent.element.addEventListener(this.events.annotationDeletedEvent.event, this.events.annotationDeletedEvent.handler, false)
    // Marked
    this.events.codeToAllEvent = { element: document, event: Events.codeToAll, handler: this.createEstimationEventListener() }
    this.events.codeToAllEvent.element.addEventListener(this.events.codeToAllEvent.event, this.events.codeToAllEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createEstimationEventListener () {
    return () => {
      this.calculateAndDisplayEstimation()
    }
  }

  getNumberOfStudentsAssignmentsSubmitted (callback) {
    if (_.isFunction(callback)) {
      if (_.isNumber(this.submittedAssignments)) {
        callback(null, this.submittedAssignments)
      } else {
        // Get url of asssignment description in moodle
        let assignmentURL = window.abwa.codebookManager.codebookReader.codebook.moodleEndpoint + 'mod/assign/view.php?id=' + window.abwa.codebookManager.codebookReader.codebook.cmid
        axios.get(assignmentURL).then((response) => {
          let container = document.implementation.createHTMLDocument().documentElement
          container.innerHTML = response.data
          let result = Number.parseInt(container.querySelector('#region-main > div:nth-child(3) > div.gradingsummary > div > table > tbody > tr:nth-child(3) > td').innerText)
          this.submittedAssignments = result
          callback(null, result)
        })
      }
    }
  }
}

export default MoodleEstimationManager
