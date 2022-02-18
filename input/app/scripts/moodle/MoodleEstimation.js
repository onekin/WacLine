import _ from 'lodash'
import AnnotationUtils from '../utils/AnnotationUtils'
import jsYaml from 'js-yaml'
import Codebook from '../codebook/model/Codebook'

class MoodleEstimation {
  static getAssessmentHistoricDataForStudentAssignmentPair ({ definitionAnnotationsFromSameCmid, assessmentAnnotations }) {
    return definitionAnnotationsFromSameCmid.map((definitionAnnotationForStudent) => {
      // Get assessment annotations for the student
      let assessmentAnnotationsForStudent = assessmentAnnotations.filter(assessmentAnnotation => {
        return assessmentAnnotation.group === definitionAnnotationForStudent.group
      })
      if (assessmentAnnotationsForStudent.length > 1) {
        assessmentAnnotationsForStudent = _.sortBy(assessmentAnnotationsForStudent, 'created')
        // Calculate taking into account that teacher could not evaluate it constantly (e.g.: whole assignment in the same day)
        // Group annotations that have not more than 1 hour of difference between it and the next/previous ones (we supose that if teacher spent more than 1 hour creating an annotation, means that there was a stop during assessment activity)
        let groups = []
        let groupCount = 0
        let time = new Date(assessmentAnnotationsForStudent[0].created).getTime()
        groups[groupCount] = [assessmentAnnotationsForStudent[0]]
        for (let i = 1; i < assessmentAnnotationsForStudent.length; i++) {
          let currentAnnoTime = new Date(assessmentAnnotationsForStudent[i].created).getTime()
          if (time < currentAnnoTime - 1000 * 60 * 15) {
            groupCount += 1
            groups[groupCount] = [assessmentAnnotationsForStudent[i]]
          } else {
            groups[groupCount].push(assessmentAnnotationsForStudent[i])
          }
          time = currentAnnoTime
        }
        // For each group, get oldest and newest annotation and sum difference
        let times = groups.map(group => {
          let oldestAnnotation = _.first(group)
          let newestAnnotation = _.last(group)
          return Math.abs(new Date(newestAnnotation.created).getTime() - new Date(oldestAnnotation.created).getTime())
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

  static retrieveAnnotationsForMarkAndGo (annotationServerManager, callback) {
    annotationServerManager.client.getListOfGroups({}, (err, groups) => {
      if (err) {
        callback(err)
      } else {
        let moodleBasedGroups = groups.filter(group => group.name.startsWith('MG'))
        let promises = []
        let annotationsPerGroup = {}
        moodleBasedGroups.forEach((moodleBasedGroup) => {
          promises.push(new Promise((resolve, reject) => {
            annotationServerManager.client.searchAnnotations({
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

  static estimateTimeInMilisecondsPendingToAssess ({ annotationsPerGroup, assignmentName, cmid, numberOfStudentsAssignmentsSubmitted }, callback) {
    // Find if same group exist
    let allAnnotations = _.flattenDeep(_.values(annotationsPerGroup))
    let definitionAnnotations = allAnnotations.filter(anno => anno.motivation === 'defining')
    let assessmentAnnotations = AnnotationUtils.filterByPurpose(allAnnotations, 'classifying')
    if (definitionAnnotations) {
      // Get definition annotations for assignment with same name (in previous courses was defined with same name)
      let definitionAnnotationsWithSameAssignmentName = definitionAnnotations.filter(anno => {
        let assignmentConfig = jsYaml.load(anno.text)
        if (assignmentConfig) {
          return assignmentConfig.assignmentName === assignmentName
        } else {
          return null
        }
      })
      // Get definition annotations for same cmid
      let definitionAnnotationsFromSameCmid = definitionAnnotations.filter(anno => AnnotationUtils.getTagFromAnnotation(anno, 'cmid:' + cmid))
      // Exists annotations or configuration for current assignment
      if (definitionAnnotationsFromSameCmid.length > 0) {
        // Get rubric
        MoodleEstimation.getCodebookForCmidFromAnnotations(cmid, allAnnotations, (err, codebook) => {
          if (err) {
            console.error(err)
          } else {
            console.log(codebook)
            // Get number of criterion evaluated for each student and its time
            let studentsAndTimes = MoodleEstimation.getAssessmentHistoricDataForStudentAssignmentPair({ assessmentAnnotations, definitionAnnotationsFromSameCmid })
            let validStudentsAndTimesToCalculateTime = _.filter(studentsAndTimes, (studentAndTime) => {
              return studentAndTime.numberOfCriterionAssessed > 0
            })
            // Calculate extra time required to assess
            let numberOfAssessedCriteria = 0
            let timeOfAssessedCriteria = 0
            validStudentsAndTimesToCalculateTime.forEach(studentAndTime => {
              timeOfAssessedCriteria += studentAndTime.time
              numberOfAssessedCriteria += studentAndTime.numberOfCriterionAssessed
            })
            let timeInMilisecondsPendingToAssess = (timeOfAssessedCriteria / numberOfAssessedCriteria) * ((codebook.themes.length * numberOfStudentsAssignmentsSubmitted) - numberOfAssessedCriteria)
            callback(null, {
              timeInMilisecondsPendingToAssess, studentsAndTimes, numberOfAssessedCriteria, timeOfAssessedCriteria
            })
          }
        })
        // Check if similar assignments are already assessed

      } else if (definitionAnnotationsWithSameAssignmentName.length > 0) { // TODO There is a previously configured group with same assignment name

      } else { // TODO There are not found annotations or configuration for current assignment, nothing to do

      }
    }
  }

  static getCodebookForCmidFromAnnotations (cmid, allAnnotations, callback) {
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
}

export default MoodleEstimation
