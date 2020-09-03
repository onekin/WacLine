import HypothesisClientManager from './annotationServer/hypothesis/HypothesisClientManager'
import BrowserStorageManager from './annotationServer/browserStorage/BrowserStorageManager'
import _ from 'lodash'
import AnnotationUtils from './utils/AnnotationUtils'
import jsYaml from 'js-yaml'
import Codebook from './codebook/model/Codebook'
import DateTimeUtils from './utils/DateTimeUtils'

class MoodleEstimation {
  init () {
    this.cmid = this.getCmid()
    this.assignmentName = this.getAssignmentName()
    this.moodleEndpoint = this.getMoodleEndpoint()
    this.loadAnnotationServer((err) => {
      if (err) {

      } else {
        this.retrieveAnnotationsForMarkAndGo((err, annotationsPerGroup) => {
          if (err) {
            console.error('Unable to retrieve annotations of previous mark&go groups')
          } else {
            // Find if same group exist
            let allAnnotations = _.flattenDeep(_.values(annotationsPerGroup))
            let definitionAnnotations = allAnnotations.filter(anno => anno.motivation === 'defining')
            let assessmentAnnotations = AnnotationUtils.filterByPurpose(allAnnotations, 'classifying')
            if (definitionAnnotations) {
              // Get definition annotations for assignment with same name (in previous courses was defined with same name)
              let definitionAnnotationsWithSameAssignmentName = definitionAnnotations.filter(anno => {
                let assignmentConfig = jsYaml.load(anno.text)
                if (assignmentConfig) {
                  return assignmentConfig.assignmentName === this.assignmentName
                }
              })
              // Get definition annotations for same cmid
              let definitionAnnotationsFromSameCmid = definitionAnnotations.filter(anno => AnnotationUtils.getTagFromAnnotation(anno, 'cmid:' + this.cmid))
              // Exists annotations or configuration for current assignment
              if (definitionAnnotationsFromSameCmid.length > 0) {
                // Get rubric
                this.getCodebookForCmidFromAnnotations(this.cmid, allAnnotations, (err, codebook) => {
                  if (err) {
                    console.error(err)
                  } else {
                    console.log(codebook)
                    // Get number of criterion evaluated for each student and its time
                    let studentsAndTimes = this.getAssessmentHistoricDataForStudentAssignmentPair({ assessmentAnnotations, definitionAnnotationsFromSameCmid })
                    let validStudentsAndTimesToCalculateTime = _.filter(studentsAndTimes, (studentAndTime) => {
                      return studentAndTime.numberOfCriterionAssessed > 0
                    })
                    // Get number of students assignments submitted
                    let numberOfStudentsAssignmentsSubmitted = Number.parseInt(document.querySelector('#region-main > div:nth-child(3) > div.gradingsummary > div > table > tbody > tr:nth-child(3) > td').innerText)
                    // Calculate extra time required to assess
                    let numberOfAssessedCriteria = 0
                    let timeOfAssessedCriteria = 0
                    validStudentsAndTimesToCalculateTime.forEach(studentAndTime => {
                      timeOfAssessedCriteria += studentAndTime.time
                      numberOfAssessedCriteria += studentAndTime.numberOfCriterionAssessed
                    })
                    let timeInMilisecondsPendingToAssess = (timeOfAssessedCriteria / numberOfAssessedCriteria) * ((codebook.themes.length * numberOfStudentsAssignmentsSubmitted) - numberOfAssessedCriteria)
                    // Display extra time required to assess
                    let rowElementInGradingSummary = document.querySelector('#region-main > div:nth-child(3) > div.gradingsummary > div > table > tbody > tr:nth-child(5)')
                    let estimatedTimeNode = rowElementInGradingSummary.cloneNode(true)
                    estimatedTimeNode.querySelector('th').innerText = 'Estimated assessment time'
                    estimatedTimeNode.querySelector('td').innerText = DateTimeUtils.getHumanReadableTimeFromUnixTimeInMiliseconds(timeInMilisecondsPendingToAssess)
                    rowElementInGradingSummary.insertAdjacentElement('afterend', estimatedTimeNode)
                  }
                })
                // Check if similar assignments are already assessed

              } else if (definitionAnnotationsWithSameAssignmentName.length > 0) { // TODO There is a previously configured group with same assignment name

              } else { // TODO There are not found annotations or configuration for current assignment, nothing to do

              }
            }
          }
        })
      }
    })
  }

  retrieveAnnotationsForMarkAndGo (callback) {
    this.annotationServerManager.client.getListOfGroups({}, (err, groups) => {
      if (err) {

      } else {
        let moodleBasedGroups = groups.filter(group => group.name.startsWith('MG'))
        let promises = []
        let annotationsPerGroup = {}
        moodleBasedGroups.forEach((moodleBasedGroup) => {
          promises.push(new Promise((resolve, reject) => {
            this.annotationServerManager.client.searchAnnotations({
              group: moodleBasedGroup.id
            }, (err, annotations) => {
              if (err) {
                reject(err)
              } else {
                annotationsPerGroup[moodleBasedGroup.id] = annotations
                resolve()
              }
            })
          }))
        })
        Promise.allSettled(promises).then(() => {
          // Get assignment name
          callback(null, annotationsPerGroup)
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

  getCodebookForCmidFromAnnotations (cmid, allAnnotations, callback) {
    let annotationsForCmid = _.filter(allAnnotations, (annotation) => {
      return _.isString(AnnotationUtils.getTagFromAnnotation(annotation, 'cmid:' + cmid))
    })
    let rubricDefinitionAnnotations = _.filter(_.first(_.values(_.groupBy(annotationsForCmid, 'group'))), anno => anno.motivation === 'codebookDevelopment' || anno.motivation === 'defining')
    Codebook.fromAnnotations(rubricDefinitionAnnotations, (err, codebook) => {
      if (err) {
        callback(err)
      } else {
        callback(null, codebook)
      }
    })
  }

  getAssessmentHistoricDataForStudentAssignmentPair ({ definitionAnnotationsFromSameCmid, assessmentAnnotations }) {
    return definitionAnnotationsFromSameCmid.map((definitionAnnotationForStudent) => {
      // Get assessment annotations for the student
      let assessmentAnnotationsForStudent = assessmentAnnotations.filter(assessmentAnnotation => {
        return assessmentAnnotation.group === definitionAnnotationForStudent.group
      })
      if (assessmentAnnotationsForStudent.length > 1) {
        // Calculate taking into account that teacher could not evaluate it constantly (e.g.: whole assignment in the same day)
        // Group annotations that have not more than 1 hour of difference between it and the next/previous ones (we supose that if teacher spent more than 1 hour creating an annotation, means that there was a stop during assessment activity)
        let groups = []
        let groupCount = 0
        let time = new Date(assessmentAnnotationsForStudent[groupCount].created).getTime()
        groups[groupCount] = [assessmentAnnotationsForStudent[groupCount]]
        for (let i = 1; i < assessmentAnnotationsForStudent.length; i++) {
          let currentAnnoTime = new Date(assessmentAnnotationsForStudent[i].created).getTime()
          if (time > currentAnnoTime + 1000 * 60 * 60) {
            groupCount += 1
            groups[groupCount] = [assessmentAnnotationsForStudent[i]]
          } else {
            groups[groupCount].push(assessmentAnnotationsForStudent[i])
          }
          time = currentAnnoTime
        }
        // For each group, get oldest and newest annotation and sum difference
        let times = groups.map(group => {
          let newestAnnotation = _.first(group)
          let oldestAnnotation = _.last(group)
          if (new Date(newestAnnotation.updated).getTime() > new Date(newestAnnotation.created).getTime() + 1000 * 60 * 60) {
            return new Date(newestAnnotation.created).getTime() - new Date(oldestAnnotation.created).getTime()
          } else {
            return new Date(newestAnnotation.updated).getTime() - new Date(oldestAnnotation.created).getTime()
          }
        })
        let timeRequired = _.sum(times)
        // Calculate number of criterion assessed
        let annotationsWithMark = assessmentAnnotationsForStudent.filter(assessmentAnnotation => {
          return AnnotationUtils.getTagFromAnnotation(assessmentAnnotation, 'oa:code:')
        })
        let assessedCriteria = _.groupBy(annotationsWithMark, (annotationWithMark) => {
          return AnnotationUtils.getTagFromAnnotation(annotationWithMark, 'oa:isCodeOf:').replace('oa:isCodeOf:', '')
        })
        return {
          time: timeRequired,
          numberOfCriterionAssessed: _.keys(assessedCriteria).length
        }
      } else if (assessmentAnnotationsForStudent.length === 1) {
        //
        if (assessmentAnnotationsForStudent[0].created !== assessmentAnnotationsForStudent[0].updated &&
          AnnotationUtils.getTagFromAnnotation(assessmentAnnotationsForStudent[0], 'oa:code:')) {
          let timeRequired = new Date(assessmentAnnotationsForStudent[0].updated).getTime() - new Date(assessmentAnnotationsForStudent[0].created).getTime()
          return {
            time: timeRequired,
            numberOfCriterionAssessed: 1
          }
        } else {
          return { time: 0, numberOfCriterionAssessed: 0 }
        }
      } else {
        return { time: 0, numberOfCriterionAssessed: 0 }
      }
    })
  }
}

window.addEventListener('load', () => {
  window.moodleResumption = {}
  window.moodleResumption.moodleResumptionContentScript = new MoodleEstimation()
  window.moodleResumption.moodleResumptionContentScript.init()
})
