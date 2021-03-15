import Task from './Task'
import _ from 'lodash'
import MoodleUtils from '../../moodle/MoodleUtils'
import AnnotationUtils from '../../utils/AnnotationUtils'
import Codebook from '../../codebook/model/Codebook'
import Config from '../../Config'
// PVSCL:IFCOND(Hypothesis, LINE)
import HypothesisClientManager from '../../annotationServer/hypothesis/HypothesisClientManager'
import Hypothesis from '../../annotationServer/hypothesis/Hypothesis'
import LanguageUtils from '../../utils/LanguageUtils'
// PVSCL:ENDCOND
// PVSCL:IFCOND(BrowserStorage, LINE)
import BrowserStorage from '../../annotationServer/browserStorage/BrowserStorage'
import BrowserStorageManager from '../../annotationServer/browserStorage/BrowserStorageManager'
// PVSCL:ENDCOND
// PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Size()>1,LINE)
import ChromeStorage from '../../utils/ChromeStorage'
// PVSCL:ENDCOND

class CreateHighlighterTask extends Task {
  constructor (config) {
    super()
    this.config = config
    this.currentPromisesList = []
  }

  init (callback) {
    const promisesData = []
    for (let i = 0; i < this.config.activities.length; i++) {
      const rubric = this.config.activities[i].data.rubric
      const student = this.config.activities[i].data.student
      const courseId = this.config.activities[i].data.courseId
      const hashedGroupName = MoodleUtils.getHashedGroup({ studentId: student.id, courseId, moodleEndpoint: rubric.moodleEndpoint })
      console.debug('Creating hashed group: ' + hashedGroupName)
      promisesData.push({ rubric, groupName: hashedGroupName, id: i })
    }

    this.currentPromisesStatus = []

    const runPromiseToGenerateGroup = (d) => {
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
          }
        })
      })
    }

    const promiseChain = promisesData.reduce(
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

  generateGroup ({ rubric, groupName, id, callback }) {
    this.currentPromisesStatus[id] = 'Checking if the group already exists'
    if (_.isFunction(callback)) {
      this.loadAnnotationServer(() => {
        this.initLoginProcess(() => {
          // Create group
          this.annotationServerClientManager.client.getUserProfile((err, userProfile) => {
            if (_.isFunction(callback)) {
              if (err) {
                console.error(err)
                this.currentPromisesStatus[id] = 'An unexpected error occurred when retrieving your user profile. Please check connection with the annotation server'
                callback(err)
              } else {
                this.currentPromisesStatus[id] = 'Checking if the annotation server is up to date'
                this.annotationServerClientManager.client.getListOfGroups({}, (err, groups) => {
                  if (err) {
                    if (_.isFunction(callback)) {
                      callback(err)
                    }
                  } else {
                    this.groups = groups
                    const group = _.find(groups, (group) => {
                      return group.name === groupName
                    })
                    if (_.isEmpty(group)) {
                      this.currentPromisesStatus[id] = 'Creating new group to store annotations'
                      this.createGroup({ name: groupName }, (err, group) => {
                        this.setAnnotationServer(group, (annotationServer) => {
                          if (err) {
                            console.error('ErrorConfiguringHighlighter')
                            this.currentPromisesStatus[id] = chrome.i18n.getMessage('ErrorConfiguringHighlighter') + chrome.i18n.getMessage('ErrorContactDeveloper', [err.message, err.stack])
                            callback(new Error(chrome.i18n.getMessage('ErrorConfiguringHighlighter') + chrome.i18n.getMessage('ErrorContactDeveloper', [err.message, err.stack])))
                          } else {
                            this.currentPromisesStatus[id] = 'Creating rubric highlighter in the annotation server'
                            this.createHighlighterAnnotations({
                              rubric, annotationServer, userProfile
                            }, () => {
                              callback(null)
                            })
                          }
                        })
                      })
                    } else {
                      this.setAnnotationServer(group, (annotationServer) => {
                        // Check if highlighter for assignment is already created
                        this.annotationServerClientManager.client.searchAnnotations({
                          group: annotationServer.getGroupId(),
                          any: '"cmid:' + rubric.cmid + '"',
                          wildcard_uri: 'https://hypothes.is/groups/*'
                        }, (err, annotations) => {
                          if (err) {
                            callback(err)
                            this.currentPromisesStatus[id] = chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator', [err.message, err.stack])
                          } else {
                            this.currentPromisesStatus[id] = 'Updating rubric highlighter in the annotation server'
                            this.updateHighlighterAnnotations({
                              rubric, annotations, annotationServer, userProfile
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

  setAnnotationServer (newGroup, callback) {
    let annotationAnnotationServer
    let group
    if (newGroup === null) {
      group = window.abwa.groupSelector.currentGroup
    } else {
      group = newGroup
    }
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Size()>1, LINE)
    ChromeStorage.getData('annotationServer.selected', ChromeStorage.sync, (err, annotationServer) => {
      if (err) {
        console.error('ErrorSettingAnnotationServer')
      } else {
        let actualAnnotationServer
        if (annotationServer) {
          actualAnnotationServer = JSON.parse(annotationServer.data)
        } else {
          actualAnnotationServer = 'browserstorage'
        }
        if (actualAnnotationServer === 'hypothesis') {
          // Hypothesis
          annotationAnnotationServer = new Hypothesis({ group: group })
        } else {
          // Browser storage
          annotationAnnotationServer = new BrowserStorage({ group: group })
        }
        if (_.isFunction(callback)) {
          callback(annotationAnnotationServer)
        }
      }
    })
    // PVSCL:ELSECOND
    // PVSCL:IFCOND(Hypothesis,LINE)
    annotationAnnotationServer = new Hypothesis({ group: group })
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage,LINE)
    annotationAnnotationServer = new BrowserStorage({ group: group })
    // PVSCL:ENDCOND
    if (_.isFunction(callback)) {
      callback(annotationAnnotationServer)
    }
    // PVSCL:ENDCOND
  }

  updateHighlighterAnnotations ({ rubric, annotations, annotationServer, userProfile }, callback) {
    // PVSCL:IFCOND(Hypothesis,LINE)
    if (LanguageUtils.isInstanceOf(this.annotationServerClientManager, HypothesisClientManager)) {
      annotationServer.group.links.html = annotationServer.group.links.html.substr(0, annotationServer.group.links.html.lastIndexOf('/'))
    }
    // PVSCL:ENDCOND
    // Create teacher annotation if not exists
    this.createTeacherAnnotation({ producerId: userProfile.userid, annotationServer: annotationServer }, (err) => {
      if (err) {
        callback(new Error(chrome.i18n.getMessage('ErrorRelatingMoodleAndTool') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator', [err.message, err.stack])))
      } else {
        // Restore object
        rubric.annotationServer = annotationServer
        rubric = Codebook.createCodebookFromObject(rubric)
        // Check annotations pending
        const annotationsPending = _.differenceWith(rubric.toAnnotations(), annotations, Codebook.codebookAnnotationsAreEqual)
        // Check annotations to remove
        const annotationsToRemove = _.differenceWith(annotations, rubric.toAnnotations(), Codebook.codebookAnnotationsAreEqual)
        if (annotationsPending.length === 0 && annotationsToRemove.length === 0) {
          console.debug('Highlighter is already updated, skipping to the next group')
          callback(null, { nothingDone: true })
        } else {
          this.annotationServerClientManager.client.deleteAnnotations(annotationsToRemove, (err) => {
            if (err) {
              callback(new Error(chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator', [err.message, err.stack])))
            } else {
              this.annotationServerClientManager.client.createNewAnnotations(annotationsPending, (err, createdAnnotations) => {
                if (err) {
                  callback(new Error(chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator', [err.message, err.stack])))
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

  createHighlighterAnnotations ({ rubric, annotationServer, userProfile }, callback) {
    // Generate group annotations
    rubric.annotationServer = annotationServer
    // PVSCL:IFCOND(Hypothesis,LINE)
    if (LanguageUtils.isInstanceOf(this.annotationServerClientManager, HypothesisClientManager)) {
      rubric.annotationServer.group.links.html = rubric.annotationServer.group.links.html.substr(0, rubric.annotationServer.group.links.html.lastIndexOf('/'))
    }
    // PVSCL:ENDCOND
    rubric = Codebook.createCodebookFromObject(rubric) // convert to rubric to be able to run toAnnotations() function
    const annotations = rubric.toAnnotations()
    this.createTeacherAnnotation({ producerId: userProfile.userid, annotationServer: annotationServer }, (err) => {
      if (err) {
        callback(new Error(chrome.i18n.getMessage('ErrorRelatingMoodleAndTool') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator', [err.message, err.stack])))
      } else {
        // Create annotations in hypothesis
        this.annotationServerClientManager.client.createNewAnnotations(annotations, (err, createdAnnotations) => {
          if (err) {
            callback(new Error(chrome.i18n.getMessage('ErrorConfiguringHighlighter') + '<br/>' + chrome.i18n.getMessage('ContactAdministrator', [err.message, err.stack])))
          } else {
            console.debug('Group created')
            callback(null)
          }
        })
      }
    })
  }

  createGroup ({ name, assignmentName = '', student = '' }, callback) {
    this.annotationServerClientManager.client.createNewGroup({ name: name, description: 'An resource based generated group to mark the assignment in moodle called ' + assignmentName }, (err, group) => {
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

  createTeacherAnnotation ({ producerId, annotationServer }, callback) {
    const teacherAnnotation = this.generateTeacherAnnotation(producerId, annotationServer)
    // Check if annotation already exists
    this.annotationServerClientManager.client.searchAnnotations({ group: annotationServer.getGroupId(), tags: Config.namespace + ':' + Config.tags.producer }, (err, annotations) => {
      if (err) {
        callback(err)
      } else {
        // If annotation exist and teacher is the same, nothing to do
        if (annotations.length > 0 && annotations[0].text === teacherAnnotation.text) {
          if (_.isFunction(callback)) {
            callback()
          }
        } else { // Otherwise, create the annotation
          this.annotationServerClientManager.client.createNewAnnotation(teacherAnnotation, (err, annotation) => {
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

  generateTeacherAnnotation (producerId, annotationServer) {
    return {
      group: annotationServer.getGroupId(),
      permissions: {
        read: ['group:' + annotationServer.getGroupId()]
      },
      references: [],
      tags: [Config.namespace + ':' + Config.tags.producer],
      target: [],
      text: 'producerId: ' + producerId,
      uri: annotationServer.group.links.html // Compatibility with both group representations getGroups and userProfile
    }
  }

  loadAnnotationServer (callback) {
    // PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Size()=1, LINE)
    // PVSCL:IFCOND(Hypothesis, LINE)
    this.annotationServerClientManager = new HypothesisClientManager()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(BrowserStorage, LINE)
    this.annotationServerClientManager = new BrowserStorageManager()
    // PVSCL:ENDCOND
    this.annotationServerClientManager.init((err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      }
    })
    // PVSCL:ELSECOND
    const defaultAnnotationServer = Config.defaultAnnotationServer
    ChromeStorage.getData('annotationServer.selected', ChromeStorage.sync, (err, annotationServer) => {
      if (err) {
        callback(err)
      } else {
        let actualStore
        if (annotationServer) {
          actualStore = JSON.parse(annotationServer.data)
        } else {
          actualStore = defaultAnnotationServer
        }
        if (actualStore === 'hypothesis') {
          // Hypothesis
          this.annotationServerClientManager = new HypothesisClientManager()
        } else {
          // Browser storage
          this.annotationServerClientManager = new BrowserStorageManager()
        }
        this.annotationServerClientManager.init((err) => {
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
    // PVSCL:ENDCOND
  }

  initLoginProcess (callback) {
    this.annotationServerClientManager.logIn((err) => {
      if (err) {
        callback(err)
      } else {
        callback(null)
      }
    })
  }

  getStatus () {
    const numberTotal = this.config.activities.length
    const finished = _.countBy(this.currentPromisesStatus, (promiseList) => {
      return promiseList === true
    }).true || '0'
    if (finished < numberTotal) {
      const currentTaskName = _.last(this.currentPromisesStatus)
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

export default CreateHighlighterTask
