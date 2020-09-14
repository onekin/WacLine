import MoodleEstimation from './MoodleEstimation'
import DateTimeUtils from '../utils/DateTimeUtils'
import axios from 'axios'
import _ from 'lodash'

class MoodleEstimationManager {
  constructor () {
    this.assignmentName = window.abwa.codebookManager.codebookReader.codebook.assignmentName
    this.cmid = window.abwa.codebookManager.codebookReader.codebook.cmid
  }

  init () {
    MoodleEstimation.retrieveAnnotationsForMarkAndGo(window.abwa.annotationServerManager, (err, annotationsPerGroup) => {
      if (err) {
        console.error('Unable to retrieve annotations of previous mark&go groups')
      } else {
        // Get number of students assignments submitted
        this.getNumberOfStudentsAssignmentsSubmitted((err, numberOfStudentsAssignmentsSubmitted) => {
          if (err) {

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
                document.querySelector('#toolsetHeader').innerHTML += ' - <span id="estimatedTimeCounter">' + DateTimeUtils.getHumanReadableTimeFromUnixTimeInMiliseconds(pendingTimeInMiliseconds) + '</span>'
              }
            })
          }
        })
      }
    })
  }

  getNumberOfStudentsAssignmentsSubmitted (callback) {
    if (_.isFunction(callback)) {
      // Get url of asssignment description in moodle
      let assignmentURL = window.abwa.codebookManager.codebookReader.codebook.moodleEndpoint + 'mod/assign/view.php?id=' + window.abwa.codebookManager.codebookReader.codebook.cmid
      axios.get(assignmentURL).then((response) => {
        let container = document.implementation.createHTMLDocument().documentElement
        container.innerHTML = response.data
        let result = Number.parseInt(container.querySelector('#region-main > div:nth-child(3) > div.gradingsummary > div > table > tbody > tr:nth-child(3) > td').innerText)
        callback(null, result)
      })
    }
  }
}

export default MoodleEstimationManager
