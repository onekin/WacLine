const Task = require('./Task')
const _ = require('lodash')
const HypothesisClientManager = require('../../hypothesis/HypothesisClientManager')
const Rubric = require('../../model/Rubric')
const CryptoUtils = require('../../utils/CryptoUtils')
const AnnotationUtils = require('../../utils/AnnotationUtils')

class CreateHighlighterTask extends Task {
  constructor (config) {
    super()
    this.config = config
    this.currentPromisesList = []
  }

  init (callback) {
    let promisesData = []
    for (let i = 0; i < this.config.activities.length; i++) {
      let rubric = this.config.activities[i].data.rubric
      let student = this.config.activities[i].data.student
      let siteUrl = new URL(rubric.moodleEndpoint)
      let courseId = this.config.activities[i].data.courseId
      let groupName = siteUrl.host + courseId + student.id
      // We create a hash using the course ID and the student ID to anonymize the Hypothes.is group
      let hashedGroupName = 'MG' + CryptoUtils.hash(groupName).substring(0, 23)
      promisesData.push({rubric, groupName: hashedGroupName, id: i})
    }

    this.currentPromisesStatus = []

    let runPromiseToGenerateHypothesisGroup = (d) => {
      return new Promise((resolve, reject) => {
        this.generateHypothesisGroup({
          rubric: d.rubric,
          groupName: d.groupName,
          id: d.id,
          callback: (err, result) => {
            if (err) {
              reject(err)
            } else {
              this.currentPromisesStatus[d.id] = true
              if (result && result.nothingDone) {
                resolve()
              } else {
                setTimeout(resolve, 5000)
              }
            }
          }})
      })
    }

    let promiseChain = promisesData.reduce(
      (chain, d) =>
        chain.then(() => {
          return runPromiseToGenerateHypothesisGroup(d)
        }), Promise.resolve()
    )

    promiseChain.then(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  generateHypothesisGroup ({rubric, groupName, id, callback}) {
    this.currentPromisesStatus[id] = 'Checking if Hypothes.is group already exists'
    if (_.isFunction(callback)) {
      this.initHypothesisClient(() => {
        // Create hypothesis group
        this.hypothesisClientManager.hypothesisClient.getUserProfile((err, userProfile) => {
          if (_.isFunction(callback)) {
            if (err) {
              console.error(err)
              this.currentPromisesStatus[id] = 'An unexpected error occurred when retrieving your user profile. Please check connection with Hypothes.is'
              callback(err)
            } else {
              this.currentPromisesStatus[id] = 'Checking if Hypothes.is is up to date'
              let group = _.find(userProfile.groups, (group) => {
                return group.name === groupName
              })
              if (_.isEmpty(group)) {
                this.currentPromisesStatus[id] = 'Creating new Hypothes.is group to store annotations'
                this.createHypothesisGroup({name: groupName}, (err, group) => {
                  if (err) {
                    console.error('ErrorConfiguringHighlighter')
                    this.currentPromisesStatus[id] = chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')
                    callback(new Error(chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')))
                  } else {
                    this.currentPromisesStatus[id] = 'Creating rubric highlighter in Hypothes.is'
                    this.createHighlighterAnnotations({
                      rubric, group, userProfile
                    }, () => {
                      callback(null)
                    })
                  }
                })
              } else {
                // Check if highlighter for assignment is already created
                this.hypothesisClientManager.hypothesisClient.searchAnnotations({
                  group: group.id,
                  any: '"exam:cmid:' + rubric.cmid + '"',
                  wildcard_uri: 'https://hypothes.is/groups/*'
                }, (err, annotations) => {
                  if (err) {
                    callback(err)
                    this.currentPromisesStatus[id] = chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')
                  } else {
                    this.currentPromisesStatus[id] = 'Updating rubric highlighter in Hypothes.is'
                    this.updateHighlighterAnnotations({
                      rubric, annotations, group, userProfile
                    }, () => {
                      callback(null)
                    })
                  }
                })
              }
            }
          }
        })
      })
    }
  }

  updateHighlighterAnnotations ({rubric, annotations, group, userProfile}, callback) {
    // Create teacher annotation if not exists
    this.createTeacherAnnotation({teacherId: userProfile.userid, hypothesisGroup: group}, (err) => {
      if (err) {
        callback(new Error(chrome.i18n.getMessage('ErrorRelatingMoodleAndTool') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')))
      } else {
        // Restore rubric object
        rubric.hypothesisGroup = group
        rubric = Rubric.createRubricFromObject(rubric) // convert to rubric to be able to run toAnnotations() function
        // Check annotations pending
        let annotationsPending = _.differenceWith(rubric.toAnnotations(), annotations, AnnotationUtils.areEqual)
        // Check annotations to remove
        let annotationsToRemove = _.differenceWith(annotations, rubric.toAnnotations(), AnnotationUtils.areEqual)
        if (annotationsPending.length === 0 && annotationsToRemove.length === 0) {
          console.debug('Highlighter is already updated, skipping to the next group')
          callback(null, {nothingDone: true})
        } else {
          this.hypothesisClientManager.hypothesisClient.deleteAnnotations(annotationsToRemove, (err) => {
            if (err) {
              callback(new Error(chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')))
            } else {
              this.hypothesisClientManager.hypothesisClient.createNewAnnotations(annotationsPending, (err, createdAnnotations) => {
                if (err) {
                  callback(new Error(chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')))
                } else {
                  console.debug('Highlighter for group updated')
                  callback(null)
                }
              })
            }
          })
        }
      }
    })
  }

  createHighlighterAnnotations ({rubric, group, userProfile}, callback) {
    // Generate group annotations
    rubric.hypothesisGroup = group
    rubric = Rubric.createRubricFromObject(rubric) // convert to rubric to be able to run toAnnotations() function
    let annotations = rubric.toAnnotations()
    this.createTeacherAnnotation({teacherId: userProfile.userid, hypothesisGroup: group}, (err) => {
      if (err) {
        callback(new Error(chrome.i18n.getMessage('ErrorRelatingMoodleAndTool') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')))
      } else {
        // Create annotations in hypothesis
        this.hypothesisClientManager.hypothesisClient.createNewAnnotations(annotations, (err, createdAnnotations) => {
          if (err) {
            callback(new Error(chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')))
          } else {
            console.debug('Group created')
            callback(null)
          }
        })
      }
    })
  }

  createHypothesisGroup ({name, assignmentName = '', student = ''}, callback) {
    this.hypothesisClientManager.hypothesisClient.createNewGroup({
      name: name, description: 'A Mark&Go generated group to mark the assignment in moodle called ' + assignmentName}, (err, group) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (_.isFunction(callback)) {
          callback(null, group)
        }
      }
    })
  }

  createTeacherAnnotation ({teacherId, hypothesisGroup}, callback) {
    let teacherAnnotation = this.generateTeacherAnnotation(teacherId, hypothesisGroup)
    // Check if annotation already exists
    this.hypothesisClientManager.hypothesisClient.searchAnnotations({group: hypothesisGroup.id, tags: 'exam:teacher'}, (err, annotations) => {
      if (err) {

      } else {
        // If annotation exist and teacher is the same, nothing to do
        if (annotations.length > 0 && annotations[0].text === teacherAnnotation.text) {
          if (_.isFunction(callback)) {
            callback()
          }
        } else { // Otherwise, create the annotation
          this.hypothesisClientManager.hypothesisClient.createNewAnnotation(teacherAnnotation, (err, annotation) => {
            if (err) {
              if (_.isFunction(callback)) {
                callback(err)
              }
            } else {
              console.debug('Created teacher annotation')
              if (_.isFunction(callback)) {
                callback()
              }
            }
          })
        }
      }
    })
  }

  generateTeacherAnnotation (teacherId, hypothesisGroup) {
    return {
      group: hypothesisGroup.id,
      permissions: {
        read: ['group:' + hypothesisGroup.id]
      },
      references: [],
      tags: ['exam:teacher'],
      target: [],
      text: 'teacherId: ' + teacherId,
      uri: hypothesisGroup.links ? hypothesisGroup.links.html : hypothesisGroup.url // Compatibility with both group representations getGroups and userProfile
    }
  }

  initHypothesisClient (callback) {
    this.hypothesisClientManager = new HypothesisClientManager()
    this.hypothesisClientManager.init(() => {
      this.hypothesisClientManager.logInHypothesis((err, hypothesisToken) => {
        if (_.isFunction(callback)) {
          if (err) {
            callback(err)
          } else {
            callback(null)
          }
        }
      })
    })
  }

  getStatus () {
    let numberTotal = this.config.activities.length
    let finished = _.countBy(this.currentPromisesStatus, (promiseList) => {
      return promiseList === true
    }).true || 'unknown'
    if (finished < numberTotal) {
      let currentTaskName = _.last(this.currentPromisesStatus)
      if (currentTaskName !== true) {
        return currentTaskName + ' (' + finished + '/' + numberTotal + ')'
      } else {
        return 'Creating Hypothes.is group (' + finished + '/' + numberTotal + ')'
      }
    } else {
      return 'Creating Hypothes.is group (' + finished + '/' + numberTotal + ')'
    }
  }
}

module.exports = CreateHighlighterTask
