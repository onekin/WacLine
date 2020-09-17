import HypothesisClientManager from './annotationServer/hypothesis/HypothesisClientManager'
import BrowserStorageManager from './annotationServer/browserStorage/BrowserStorageManager'
import _ from 'lodash'
import DateTimeUtils from './utils/DateTimeUtils'
import MoodleEstimation from './moodle/MoodleEstimation'

class MoodleEstimationContentScript {
  init () {
    this.cmid = this.getCmid()
    this.assignmentName = this.getAssignmentName()
    this.moodleEndpoint = this.getMoodleEndpoint()
    this.loadAnnotationServer((err) => {
      if (err) {
        console.error('Unable to load annotation server. Error: ' + err.message)
      } else {
        MoodleEstimation.retrieveAnnotationsForMarkAndGo(this.annotationServerManager, (err, annotationsPerGroup) => {
          if (err) {
            console.error('Unable to retrieve annotations of previous mark&go groups. Error: ' + err.message)
          } else {
            // Get number of students assignments submitted
            let numberOfStudentsAssignmentsSubmitted = Number.parseInt(document.querySelector('#region-main > div:nth-child(3) > div.gradingsummary > div > table > tbody > tr:nth-child(3) > td').innerText)
            MoodleEstimation.estimateTimeInMilisecondsPendingToAssess({
              annotationsPerGroup, assignmentName: this.assignmentName, cmid: this.cmid, numberOfStudentsAssignmentsSubmitted
            }, (err, { timeInMilisecondsPendingToAssess }) => {
              if (err) {
                console.error(err)
              } else {
                // Display extra time required to assess
                let humanReadablePendingTime = DateTimeUtils.getHumanReadableTimeFromUnixTimeInMiliseconds(timeInMilisecondsPendingToAssess)
                if (_.isError(humanReadablePendingTime)) {
                  console.error('Unable to calculate estimated time to assess')
                } else {
                  let rowElementInGradingSummary = document.querySelector('#region-main > div:nth-child(3) > div.gradingsummary > div > table > tbody > tr:nth-child(5)')
                  let estimatedTimeNode = rowElementInGradingSummary.cloneNode(true)
                  estimatedTimeNode.querySelector('th').innerText = 'Estimated assessment time'
                  estimatedTimeNode.querySelector('td').innerText = humanReadablePendingTime
                  rowElementInGradingSummary.insertAdjacentElement('afterend', estimatedTimeNode)
                }
              }
            })
          }
        })
      }
    })
  }

  loadAnnotationServer (callback) {
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Size()=1, LINE)
    // PVSCL:IFCOND(Hypothesis, LINE)
    this.annotationServerManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage, LINE)
    this.annotationServerManager = new BrowserStorageManager()
    // PVSCL:ENDCOND
    this.annotationServerManager.init((err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      }
    })
    // PVSCL:ELSECOND
    chrome.runtime.sendMessage({
      scope: 'annotationServer',
      cmd: 'getSelectedAnnotationServer'
    }, ({ annotationServer }) => {
      if (annotationServer === 'hypothesis') {
        // Hypothesis
        this.annotationServerManager = new HypothesisClientManager()
      } else {
        // Browser storage
        this.annotationServerManager = new BrowserStorageManager()
      }
      this.annotationServerManager.init((err) => {
        if (_.isFunction(callback)) {
          if (err) {
            callback(err)
          } else {
            callback()
          }
        }
      })
    })
    // PVSCL:ENDCOND
  }

  getCmid () {
    // For page with form: mod/assign/view.php?id=
    return new URL(window.location.href).searchParams.get('id')
  }

  getAssignmentName () {
    return document.querySelector('#region-main > div:nth-child(3) > h2').innerText
  }

  getMoodleEndpoint () {
    return window.location.href.split('mod/assign/view.php')[0]
  }
}

window.addEventListener('load', () => {
  window.moodleEstimation = {}
  window.moodleEstimation.moodleEstimationContentScript = new MoodleEstimationContentScript()
  window.moodleEstimation.moodleEstimationContentScript.init()
})
