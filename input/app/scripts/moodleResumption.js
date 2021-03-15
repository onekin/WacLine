import _ from 'lodash'
import HypothesisClientManager from './annotationServer/hypothesis/HypothesisClientManager'
import BrowserStorageManager from './annotationServer/browserStorage/BrowserStorageManager'
import MoodleFunctions from './moodle/MoodleFunctions'
import MoodleClientManager from './moodle/MoodleClientManager'
import MoodleUtils from './moodle/MoodleUtils'

class MoodleResumptionContentScript {
  init () {
    console.debug('Loading moodle resumption content script')
    this.moodleEndpoint = this.getMoodleInstanceUrl()
    this.moodleClientManager = new MoodleClientManager(this.moodleEndpoint)
    this.moodleClientManager.init((err) => {
      if (err) {
        console.error('Unable to load moodle client manager.' + err.message)
      } else {
        // Get course id
        this.courseId = this.getCourseId()
        // Get list of students' id
        this.getStudentsId(this.courseId, (err, students) => {
          if (err) {
            console.error('Unable to retrieve students from this course.' + err.message)
          } else {
            this.loadAnnotationServer(() => {
              this.getUserGroups((err, groups) => {
                if (err) {
                  console.error('Unable to retrieve groups of current user')
                } else {
                  // Get assignments
                  const activityInstances = [...document.querySelectorAll('.activityinstance')]
                  activityInstances.forEach((activityInstance) => {
                    let activityUrl = activityInstance.querySelector('.aalink').href
                    let activityId = this.getActivityIdFromUrl(activityUrl)
                    // Get annotations for each activity
                    this.annotationServerManager.client.searchAnnotations({
                      wildcard_uri: this.moodleEndpoint + '*',
                      tag: 'cmid:' + activityId,
                      sort: 'updated'
                    }, (err, annotations) => {
                      if (err) {
                        console.error('Unable to retrieve annotations to check recent activity for moodle activity ' + activityId)
                      } else {
                        if (annotations.length > 0) {
                          // Get last annotation
                          let lastAnnotation = annotations[0]
                          let groupOfLastAnnotation = groups.find(group => group.id === lastAnnotation.group)
                          // Find student for group of last annotation
                          let student = this.findStudentForAnnotationGroup({ groupName: groupOfLastAnnotation.name, students })
                          // Get link to last student
                          let studentGradePageUrl = this.getStudentGradePageUrl({ assignmentId: activityId, studentId: student.id })
                          // Create icon
                          let actionsContainer = activityInstance.parentElement.querySelector('.actions')
                          if (actionsContainer) {
                            actionsContainer.insertAdjacentHTML('afterbegin', '<span class="resumptionFacility">' +
                              '<a target="_blank" href="' + studentGradePageUrl + '"><img title="Resume ' + student.name + '\'s assessment" class="icon iconsmall" style="width:24px;height:24px;" src="' + chrome.extension.getURL('/images/resume.png') + '"/></a></span>')
                          }
                          console.debug('Loading moodle resumption content script')
                        }
                      }
                    })
                  })
                }
              })
            })
          }
        })
      }
    })
  }

  getStudentGradePageUrl ({ assignmentId, studentId }) {
    // The grading url has the following form: https://moodle.haritzmedina.com/mod/assign/view.php?id=2&action=grader&userid=4
    return this.moodleEndpoint + 'mod/assign/view.php?id=' + assignmentId + '&action=grader&userid=' + studentId
  }

  getUserGroups (callback) {
    this.annotationServerManager.client.getListOfGroups(null, (err, groups) => {
      if (err) {
        callback(err)
      } else {
        callback(null, groups)
      }
    })
  }

  getStudentsId (courseId, callback) {
    this.getStudents(courseId, (err, students) => {
      if (err) {
        callback(err)
      } else {
        let studentsIds = _.compact(students.map((student) => {
          if (student.roles.find(role => role.shortname === 'student')) {
            return { id: student.id, name: student.fullname }
          } else {
            return null
          }
        }))
        callback(null, studentsIds)
      }
    })
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

  getCourseId () {
    return new URL(window.location.href).searchParams.get('id')
  }

  destroy () {

  }

  getActivityIdFromUrl (url) {
    let parsedUrl = new URL(url)
    return parsedUrl.searchParams.get('id')
  }

  getMoodleInstanceUrl () {
    return window.location.href.split('course/view.php')[0]
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
    chrome.runtime.sendMessage({ scope: 'annotationServer', cmd: 'getSelectedAnnotationServer' }, ({ annotationServer }) => {
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

  findStudentForAnnotationGroup ({ groupName, students }) {
    return students.find((student) => {
      const hashedGroupName = MoodleUtils.getHashedGroup({ studentId: student.id, courseId: this.courseId, moodleEndpoint: this.moodleEndpoint })
      if (hashedGroupName === groupName) {
        return student
      } else {
        return null
      }
    })
  }
}

window.addEventListener('load', () => {
  window.moodleResumption = {}
  window.moodleResumption.moodleResumptionContentScript = new MoodleResumptionContentScript()
  window.moodleResumption.moodleResumptionContentScript.init()
})
