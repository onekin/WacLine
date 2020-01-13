const MoodleClientManager = require('../moodle/MoodleClientManager')
const MoodleFunctions = require('../moodle/MoodleFunctions')
const _ = require('lodash')
// PVSCL:IFCOND(Hypothesis, LINE)
const HypothesisClientManager = require('../annotationServer/hypothesis/HypothesisClientManager')
// PVSCL:ENDCOND
// PVSCL:IFCOND(BrowserStorage, LINE)
const BrowserStorageManager = require('../annotationServer/browserStorage/BrowserStorageManager')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Code, LINE)
const Code = require('../definition/Code')
// PVSCL:ENDCOND
const Alerts = require('../utils/Alerts')
const AnnotationGuide = require('../definition/AnnotationGuide')
const Theme = require('../definition/Theme')
const LanguageUtils = require('../utils/LanguageUtils')
const CircularJSON = require('circular-json-es6')
const MoodleScraping = require('./MoodleScraping')

class MoodleProvider {
  constructor () {
    this.rubric = null
    this.assignmentId = null
    this.moodleEndpoint = null
    this.assignmentName = null
    this.AnnotationServerClientManager = null
  }

  init (callback) {
    // Ask for configuration
    Alerts.confirmAlert({title: 'Mark&Go assignment configuration',
      text: 'Do you want to configure this assignment to mark using Mark&Go?',
      cancelCallback: () => {
        callback(null)
      },
      callback: () => {
        // Create hypothesis client
        this.loadAnnotationServer(() => {
          MoodleScraping.scrapAssignmentData((err, assignmentData) => {
            if (err) {

            } else {
              this.cmid = assignmentData.cmid
              this.moodleEndpoint = assignmentData.moodleEndpoint
              this.assignmentName = assignmentData.assignmentName
              // Create moodle client
              this.moodleClientManager = new MoodleClientManager(this.moodleEndpoint)
              this.moodleClientManager.init((err) => {
                if (err) {
                  // Unable to init moodle client manager
                  Alerts.errorAlert({text: 'Unable to retrieve rubric from moodle, have you the required permissions to get the rubric via API?'})
                  callback(err)
                } else {
                  let promises = []
                  // Get rubric
                  promises.push(new Promise((resolve, reject) => {
                    this.getRubric(assignmentData.cmid, assignmentData.courseId, (err, rubric) => {
                      if (err) {
                        reject(err)
                      } else {
                        resolve(rubric)
                      }
                    })
                  }))
                  // Get students
                  promises.push(new Promise((resolve, reject) => {
                    this.getStudents(assignmentData.courseId, (err, rubric) => {
                      if (err) {
                        reject(err)
                      } else {
                        resolve(rubric)
                      }
                    })
                  }))
                  Promise.all(promises).catch((rejects) => {
                    let reject = _.isArray(rejects) ? rejects[0] : rejects
                    Alerts.errorAlert({
                      title: 'Something went wrong',
                      text: reject.message
                    })
                  }).then((resolves) => {
                    if (resolves && resolves.length > 1) {
                      let students = null
                      if (LanguageUtils.isInstanceOf(resolves[0], AnnotationGuide)) {
                        this.rubric = resolves[0]
                        students = resolves[1]
                      } else {
                        this.rubric = resolves[1]
                        students = resolves[0]
                      }
                      // Send task to background
                      chrome.runtime.sendMessage({scope: 'task', cmd: 'createHighlighters', data: {rubric: CircularJSON.stringifyStrict(this.rubric), students: students, courseId: assignmentData.courseId}}, (result) => {
                        if (result.err) {
                          Alerts.errorAlert({
                            title: 'Something went wrong',
                            text: 'Error when sending createHighlighters to the background. Please try it again.'
                          })
                        } else {
                          let minutes = result.minutes
                          let notFirstTime = false
                          Alerts.infoAlert2({
                            title: 'Configuration started',
                            text: 'We are configuring the assignment to mark using Mark&Go.' +
                              `This can take around <b>${minutes} minute(s)</b>.` +
                              'You can close this window, we will notify you when it is finished.<br/>Current status: <span></span>',
                            timerIntervalHandler: (swal, timerInterval) => {
                              chrome.runtime.sendMessage({scope: 'task', cmd: 'getCurrentTaskStatus'}, (result) => {
                                if (result.status && result.status === 'Nothing pending' && notFirstTime) {
                                  Alerts.closeAlert()
                                  clearInterval(timerInterval)
                                  Alerts.infoAlert2({text: 'The assignment is correctly configured', title: 'Configuration finished'})
                                } else if (result.status && result.status === 'CreateHighlighterTask pending') {
                                  notFirstTime = true
                                  swal.getContent().querySelector('span').textContent = result.statusMessage
                                }
                              })
                            },
                            timerIntervalPeriodInSeconds: 2
                          })
                          // Show message
                          callback(null)
                        }
                      })
                    }
                  }).catch((rejects) => {
                    let reject = _.isArray(rejects) ? rejects[0] : rejects
                    Alerts.errorAlert({
                      title: 'Something went wrong',
                      text: reject.message + '.\n' + chrome.i18n.getMessage('ContactAdministrator')
                    })
                  })
                }
              })
            }
          })
        })
      }
    })
  }

  getRubric (cmid, courseId, callback) {
    if (_.isFunction(callback)) {
      this.moodleClientManager.getRubric(cmid, (err, rubrics) => {
        if (err) {
          callback(new Error('Unable to get rubric from moodle. Check if you have the permission: ' + MoodleFunctions.getRubric.wsFunc))
        } else {
          this.moodleClientManager.getCmidInfo(cmid, (err, cmidInfo) => {
            if (err) {
              callback(new Error('Unable to retrieve assignment id from Moodle. Check if you have the permission: ' + MoodleFunctions.getCourseModuleInfo.wsFunc))
            } else {
              let assignmentId = cmidInfo.cm.instance
              this.constructRubricsModel({
                moodleRubrics: rubrics,
                courseId: courseId,
                assignmentId: assignmentId,
                callback: callback
              })
            }
          })
        }
      })
    }
  }

  getStudents (courseId, callback) {
    this.moodleClientManager.getStudents(courseId, (err, students) => {
      if (err) {
        callback(new Error('Unable to get students from moodle. Check if you have the permission: ' + MoodleFunctions.getStudents.wsFunc))
      } else {
        callback(null, students)
      }
    })
  }

  showToolIsConfiguring () {
    Alerts.loadingAlert({
      title: 'Configuring the tool, please be patient', // TODO i18n
      text: 'If the tool takes too much time, please reload the page and try again.'
    })
  }

  loadAnnotationServer (callback) {
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren()->pv:Size()=1, LINE)
    // PVSCL:IFCOND(Hypothesis, LINE)
    this.AnnotationServerClientManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage, LINE)
    this.AnnotationServerClientManager = new BrowserStorageManager()
    // PVSCL:ENDCOND
    this.AnnotationServerClientManager.init(() => {
      this.initLoginProcess((err) => {
        if (_.isFunction(callback)) {
          if (err) {
            callback(err)
          } else {
            callback()
          }
        }
      })
    })
    // PVSCL:ELSECOND
    chrome.runtime.sendMessage({scope: 'annotationServer', cmd: 'getSelectedAnnotationServer'}, ({annotationServer}) => {
      if (annotationServer === 'hypothesis') {
        // Hypothesis
        this.AnnotationServerClientManager = new HypothesisClientManager()
      } else {
        // Browser storage
        this.AnnotationServerClientManager = new BrowserStorageManager()
      }
      this.AnnotationServerClientManager.init(() => {
        this.initLoginProcess((err) => {
          if (_.isFunction(callback)) {
            if (err) {
              callback(err)
            } else {
              callback()
            }
          }
        })
      })
    })
    // PVSCL:ENDCOND
  }

  initLoginProcess (callback) {
    this.AnnotationServerClientManager.logIn((err) => {
      if (err) {
        callback(err)
      } else {
        callback(null)
      }
    })
  }

  constructRubricsModel ({moodleRubrics, courseId, assignmentId, callback}) {
    this.rubric = new AnnotationGuide({
      name: _.get(moodleRubrics, 'areas[0].definitions[0].name'),
      moodleEndpoint: this.moodleEndpoint,
      assignmentName: this.assignmentName,
      courseId: courseId
    })
    // Ensure a rubric is retrieved
    if (moodleRubrics.areas[0].activemethod === 'rubric') {
      let rubricCriteria = _.get(moodleRubrics, 'areas[0].definitions[0].rubric.rubric_criteria')
      let rubricCmid = _.get(moodleRubrics, 'areas[0].cmid')
      if (!_.isUndefined(rubricCriteria) && !_.isUndefined(assignmentId) && !_.isUndefined(rubricCmid)) {
        // Set assignment id
        this.rubric.assignmentId = assignmentId
        this.rubric.cmid = moodleRubrics.areas[0].cmid
        // Generate rubric model
        for (let i = 0; i < rubricCriteria.length; i++) {
          let moodleCriteria = rubricCriteria[i]
          let criteria = new Theme({name: LanguageUtils.normalizeString(moodleCriteria.description), id: moodleCriteria.id, description: LanguageUtils.normalizeString(moodleCriteria.description), annotationGuide: this.rubric})
          // PVSCL:IFCOND(Code, LINE)
          for (let j = 0; j < moodleCriteria.levels.length; j++) {
            let moodleLevel = moodleCriteria.levels[j]
            let level = new Code({name: moodleLevel.score, id: moodleLevel.id, description: LanguageUtils.normalizeString(moodleLevel.definition), theme: criteria})
            criteria.codes.push(level)
          }
          // PVSCL:ENDCOND
          this.rubric.themes.push(criteria)
        }
        callback(null, this.rubric)
      } else {
        // Message user assignment has not a rubric associated
        Alerts.errorAlert({text: 'This assignment has not a rubric.'}) // TODO i18n
        if (_.isFunction(callback)) {
          callback()
        }
      }
    } else {
      // Message user assignment has not a rubric associated
      Alerts.errorAlert({text: 'This assignment has not a rubric.'}) // TODO i18n
      if (_.isFunction(callback)) {
        callback()
      }
    }
  }
}

module.exports = MoodleProvider
