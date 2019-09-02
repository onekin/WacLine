const Task = require('./Task')
const _ = require('lodash')
const CryptoUtils = require('../../utils/CryptoUtils')
const AnnotationUtils = require('../../utils/AnnotationUtils')
const AnnotationGuide = require('../../definition/AnnotationGuide')
const Config = require('../../Config')
// PVSCL:IFCOND(Hypothesis, LINE)
const HypothesisClientManager = require('../../storage/hypothesis/HypothesisClientManager')
const Hypothesis = require('../../storage/hypothesis/Hypothesis')
const LanguageUtils = require('../../utils/LanguageUtils')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Local, LINE)
const Local = require('../../storage/local/Local')
const LocalStorageManager = require('../../storage/local/LocalStorageManager')
// PVSCL:ENDCOND
//PVSCL:IFCOND(Storage->pv:SelectedChildren()->pv:Size()>1,LINE)
const ChromeStorage = require('../../utils/ChromeStorage')
// PVSCL:ENDCOND

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

    let runPromiseToGenerateGroup = (d) => {
      return new Promise((resolve, reject) => {
        this.generateGroup({
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
          return runPromiseToGenerateGroup(d)
        }), Promise.resolve()
    )

    promiseChain.then(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  generateGroup ({rubric, groupName, id, callback}) {
    this.currentPromisesStatus[id] = 'Checking if the group already exists'
    if (_.isFunction(callback)) {
      this.loadStorage(() => {
        this.initLoginProcess(() => {
          // Create group
          this.storageClientManager.client.getUserProfile((err, userProfile) => {
            if (_.isFunction(callback)) {
              if (err) {
                console.error(err)
                this.currentPromisesStatus[id] = 'An unexpected error occurred when retrieving your user profile. Please check connection with the storage'
                callback(err)
              } else {
                this.currentPromisesStatus[id] = 'Checking if the storage is up to date'
                this.storageClientManager.client.getListOfGroups({}, (err, groups) => {
                  if (err) {
                    if (_.isFunction(callback)) {
                      callback(err)
                    }
                  } else {
                    this.groups = groups
                    let group = _.find(groups, (group) => {
                      return group.name === groupName
                    })
                    if (_.isEmpty(group)) {
                      this.currentPromisesStatus[id] = 'Creating new group to store annotations'
                      this.createGroup({name: groupName}, (err, group) => {
                        this.setStorage(group, (storage) => {
                          if (err) {
                            console.error('ErrorConfiguringHighlighter')
                            this.currentPromisesStatus[id] = chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')
                            callback(new Error(chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')))
                          } else {
                            this.currentPromisesStatus[id] = 'Creating rubric highlighter in the storage'
                            this.createHighlighterAnnotations({
                              rubric, storage, userProfile
                            }, () => {
                              callback(null)
                            })
                          }
                        })
                      })
                    } else {
                      this.setStorage(group, (storage) => {
                        // Check if highlighter for assignment is already created
                        this.storageClientManager.client.searchAnnotations({
                          group: storage.group.id,
                          any: '"cmid:' + rubric.cmid + '"',
                          wildcard_uri: 'https://hypothes.is/groups/*'
                        }, (err, annotations) => {
                          if (err) {
                            callback(err)
                            this.currentPromisesStatus[id] = chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')
                          } else {
                            this.currentPromisesStatus[id] = 'Updating rubric highlighter in the storage'
                            this.updateHighlighterAnnotations({
                              rubric, annotations, storage, userProfile
                            }, () => {
                              callback(null)
                            })
                          }
                        })
                      })
                    }
                  }
                })
              }
            }
          })
        })
      })
    }
  }

  setStorage (newGroup, callback) {
    let annotationStorage
    let group
    if (newGroup === null) {
      group = window.abwa.groupSelector.currentGroup
    } else {
      group = newGroup
    }
    //PVSCL:IFCOND(Storage->pv:SelectedChildren()->pv:Size()>1,LINE)
    ChromeStorage.getData('storage.selected', ChromeStorage.sync, (err, storage) => {
      if (err) {
        console.error('ErrorSettingStorage')
      } else {
        let actualStore
        if (storage) {
          actualStore = JSON.parse(storage.data)
        } else {
          actualStore = 'localStorage'
        }
        if (actualStore === 'hypothesis') {
          // Hypothesis
          annotationStorage = new Hypothesis({group: group})
        } else {
          // Local storage
          annotationStorage = new Local({group: group})
        }
        if (_.isFunction(callback)) {
          callback(annotationStorage)
        }
      }
    })
    // PVSCL:ELSECOND
    // PVSCL:IFCOND(Hypothesis,LINE)
    annotationStorage = new Hypothesis({group: group})
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Local,LINE)
    annotationStorage = new Local({group: group})
    // PVSCL:ENDCOND
    if (_.isFunction(callback)) {
      callback(annotationStorage)
    }
    // PVSCL:ENDCOND
  }

  updateHighlighterAnnotations ({rubric, annotations, storage, userProfile}, callback) {
    // PVSCL:IFCOND(Hypothesis,LINE)
    if (LanguageUtils.isInstanceOf(this.storageClientManager, HypothesisClientManager)) {
      storage.group.links.html = storage.group.links.html.substr(0, storage.group.links.html.lastIndexOf('/'))
    }
    // PVSCL:ENDCOND
    // Create teacher annotation if not exists
    this.createTeacherAnnotation({teacherId: userProfile.userid, storage: storage}, (err) => {
      if (err) {
        callback(new Error(chrome.i18n.getMessage('ErrorRelatingMoodleAndTool') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')))
      } else {
        // Restore object
        rubric.storage = storage
        rubric = AnnotationGuide.createAnnotationGuideFromObject(rubric)
        // Check annotations pending
        let annotationsPending = _.differenceWith(rubric.toAnnotations(), annotations, AnnotationUtils.areEqual)
        // Check annotations to remove
        let annotationsToRemove = _.differenceWith(annotations, rubric.toAnnotations(), AnnotationUtils.areEqual)
        if (annotationsPending.length === 0 && annotationsToRemove.length === 0) {
          console.debug('Highlighter is already updated, skipping to the next group')
          callback(null, {nothingDone: true})
        } else {
          this.storageClientManager.client.deleteAnnotations(annotationsToRemove, (err) => {
            if (err) {
              callback(new Error(chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')))
            } else {
              this.storageClientManager.client.createNewAnnotations(annotationsPending, (err, createdAnnotations) => {
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

  createHighlighterAnnotations ({rubric, storage, userProfile}, callback) {
    // Generate group annotations
    rubric.storage = storage
    // PVSCL:IFCOND(Hypothesis,LINE)
    if (LanguageUtils.isInstanceOf(this.storageClientManager, HypothesisClientManager)) {
      rubric.storage.group.links.html = rubric.storage.group.links.html.substr(0, rubric.storage.group.links.html.lastIndexOf('/'))
    }
    // PVSCL:ENDCOND
    rubric = AnnotationGuide.createAnnotationGuideFromObject(rubric) // convert to rubric to be able to run toAnnotations() function
    let annotations = rubric.toAnnotations()
    this.createTeacherAnnotation({teacherId: userProfile.userid, storage: storage}, (err) => {
      if (err) {
        callback(new Error(chrome.i18n.getMessage('ErrorRelatingMoodleAndTool') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator')))
      } else {
        // Create annotations in hypothesis
        this.storageClientManager.client.createNewAnnotations(annotations, (err, createdAnnotations) => {
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

  createGroup ({name, assignmentName = '', student = ''}, callback) {
    this.storageClientManager.client.createNewGroup({
      name: name, description: 'An resource based generated group to mark the assignment in moodle called ' + assignmentName}, (err, group) => {
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

  createTeacherAnnotation ({teacherId, storage}, callback) {
    let teacherAnnotation = this.generateTeacherAnnotation(teacherId, storage)
    // Check if annotation already exists
    this.storageClientManager.client.searchAnnotations({group: storage.group.id, tags: Config.namespace + ':' + Config.tags.teacher}, (err, annotations) => {
      if (err) {

      } else {
        // If annotation exist and teacher is the same, nothing to do
        if (annotations.length > 0 && annotations[0].text === teacherAnnotation.text) {
          if (_.isFunction(callback)) {
            callback()
          }
        } else { // Otherwise, create the annotation
          this.storageClientManager.client.createNewAnnotation(teacherAnnotation, (err, annotation) => {
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

  generateTeacherAnnotation (teacherId, storage) {
    return {
      group: storage.group.id,
      permissions: {
        read: ['group:' + storage.group.id]
      },
      references: [],
      tags: [Config.namespace + ':' + Config.tags.teacher],
      target: [],
      text: 'teacherId: ' + teacherId,
      uri: storage.group.links.html // Compatibility with both group representations getGroups and userProfile
    }
  }
//PVSCL:IFCOND(Storage->pv:SelectedChildren()->pv:Size()=1, LINE)

  loadStorage (callback) {
    // PVSCL:IFCOND(Hypothesis, LINE)
    this.storageClientManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Local, LINE)
    this.storageClientManager = new LocalStorageManager()
    // PVSCL:ENDCOND
    this.storageClientManager.init((err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      }
    })
  }
//PVSCL:ELSECOND

  loadStorage (callback) {
    let defaultStorage = 'PVSCL:EVAL(Storage->pv:SelectedChildren()->pv:Item(0)->pv:Attribute('variableName'))'
    ChromeStorage.getData('storage.selected', ChromeStorage.sync, (err, storage) => {
      if (err) {
        callback(err)
      } else {
        let actualStore
        if (storage) {
          actualStore = JSON.parse(storage.data)
        } else {
          actualStore = defaultStorage
        }
        if (actualStore === 'hypothesis') {
          // Hypothesis
          this.storageClientManager = new HypothesisClientManager()
        } else {
          // Local storage
          this.storageClientManager = new LocalStorageManager()
        }
        this.storageClientManager.init((err) => {
          if (_.isFunction(callback)) {
            if (err) {
              callback(err)
            } else {
              callback()
            }
          }
        })
      }
    })
  }
//PVSCL:ENDCOND

  initLoginProcess (callback) {
    this.storageClientManager.logIn((err) => {
      if (err) {
        callback(err)
      } else {
        callback(null)
      }
    })
  }

  getStatus () {
    let numberTotal = this.config.activities.length
    let finished = _.countBy(this.currentPromisesStatus, (promiseList) => {
      return promiseList === true
    }).true || '0'
    if (finished < numberTotal) {
      let currentTaskName = _.last(this.currentPromisesStatus)
      if (currentTaskName !== true) {
        return currentTaskName + ' (' + finished + '/' + numberTotal + ')'
      } else {
        return 'Creating group (' + finished + '/' + numberTotal + ')'
      }
    } else {
      return 'Creating group (' + finished + '/' + numberTotal + ')'
    }
  }
}

module.exports = CreateHighlighterTask
