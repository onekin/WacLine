import axios from 'axios'
import _ from 'lodash'
import jsonFormData from 'json-form-data'
import DOM from '../utils/DOM'

class APISimulation {
  static getRubric (cmids, callback) {
    // TODO Verify that cmids is not an array
    // TODO Go to task main page
    const taskMainPageUrl = window.mag.moodleContentScript.moodleEndpoint + 'mod/assign/view.php?id=' + cmids
    axios.get(taskMainPageUrl)
      .then((response) => {
        const parser = new window.DOMParser()
        const docPreferences = parser.parseFromString(response.data, 'text/html')
        const rubricURLElement = docPreferences.querySelector('a[href*="grade/grading/manage.php?"]')
        if (rubricURLElement) {
          // TODO Go to rubric page
          const rubricURL = rubricURLElement.href
          axios.get(rubricURL)
            .then((response) => {
              const parser = new window.DOMParser()
              const docPreferences = parser.parseFromString(response.data, 'text/html')
              const rubricTable = docPreferences.querySelector('#rubric-criteria')
              // TODO Get each criterion
              const rubricCriteria = APISimulation.getRubricCriteriaFromRubricTable(rubricTable)
              const assignmentId = APISimulation.getAssignmentId(docPreferences)
              const assignmentName = APISimulation.getAssignmentName(docPreferences)
              // For each criterion
              const formattedRubric = APISimulation.constructGetRubricResponse({ rubricCriteria, cmid: cmids, assignmentId, assignmentName })
              callback(null, formattedRubric)
            })
        } else {
          // TODO Unable to retrieve rubric url
        }
      })
    // TODO Get table of rubrics
  }

  /**
   * Given a moodle endpoint, context id and student id it tries to scrap from student's assignment file item id of feedback files submission
   * @param moodleEndpoint
   * @param contextId
   * @param studentId
   * @param callback
   */
  static scrapFileItemId ({ moodleEndpoint, contextId, studentId }, callback) {
    APISimulation.getCurrentSessionKey(moodleEndpoint, (err, sessionKey) => {
      if (err) {
        callback(err)
      } else {
        try {
          // Retrieve feedbackfileitem from moodle using the same call as the webpage use to this end
          let body = [{
            index: 0,
            methodname: 'core_get_fragment',
            args: {
              component: 'mod_assign',
              callback: 'gradingpanel',
              contextid: contextId,
              args: [{
                name: 'userid', value: studentId
              }, {
                name: 'attemptnumber', value: -1
              }, {
                name: 'jsonformdata',
                value: '""'
              }]
            }
          }]
          fetch(moodleEndpoint + 'lib/ajax/service.php?sesskey=' + sessionKey + '&info=core_get_fragment', {
            headers: {
              accept: 'application/json, text/javascript, */*; q=0.01',
              'cache-control': 'no-cache',
              'content-type': 'application/json',
              pragma: 'no-cache'
            },
            body: JSON.stringify(body),
            method: 'POST',
            mode: 'cors',
            credentials: 'include'
          }).then(result => result.json()).then(res => {
            if (res[0] && res[0].data && res[0].data.html) {
              let elems = DOM.getNodeFromHTMLStringDOM(res[0].data.html, "input[id*='id_files_']")
              if (elems instanceof NodeList && _.isElement(elems[0])) { // Check if is type of NodeList https://stackoverflow.com/a/39965818
                callback(null, elems[0].value)
              } else {
                callback(new Error('Unable to retrieve file item id. Request is correctly done, but element was not found.'))
              }
            } else {
              callback(new Error('Unable to retrieve file item id. Request is correctly done, but element was not found.'))
            }
          })
        } catch (e) {
          callback(e)
        }
      }
    })
  }

  static getAssignmentName () {
    // TODO Get assignment name
    return null
  }

  static getRubricCriteriaFromRubricTable (rubricTable) {
    const criterionElements = rubricTable.querySelectorAll('.criterion')
    const criterias = []
    for (let i = 0; i < criterionElements.length; i++) {
      const criterionElement = criterionElements[i]
      const criteria = {}
      // Get id
      criteria.id = parseInt(_.last(criterionElement.id.split('-')))
      criteria.sortorder = i + 1
      criteria.description = criterionElement.querySelector('.description').innerText
      criteria.descriptionformat = 1 // The one by default is 1
      const levelElements = criterionElement.querySelectorAll('.level')
      const levels = []
      for (let j = 0; j < levelElements.length; j++) {
        const levelElement = levelElements[j]
        const level = {}
        // Get level id
        level.id = parseInt(_.last(levelElement.id.split('-')))
        // Get score
        level.score = parseFloat(levelElement.querySelector('.scorevalue').innerText)
        // Get descriptor
        level.definition = levelElement.querySelector('.definition').innerText
        // Get defintion format
        level.definitionformat = 1 // Default format of level definition
        // Add to levels
        levels.push(level)
      }
      criteria.levels = levels
      criterias.push(criteria)
    }
    return criterias
  }

  static getAssignmentId (document) {
    const deleteformElement = document.querySelector('a[href*="deleteform"]')
    if (deleteformElement) {
      const url = new URL(deleteformElement.href)
      return url.searchParams.get('deleteform')
    } else {
      return null
    }
  }

  static async retrieveFeedbackFileItemId () {
    if (window.abwa.targetManager.fileMetadata.feedbackFileItemId) {
      return window.abwa.targetManager.fileMetadata.feedbackFileItemId
    } else {
      // TODO Try to get from Moodle file manager, somehow
    }
  }

  static updateFeedbackSubmissionFile (
    moodleEndpoint,
    { file, itemId, contextId, license, author },
    callback
  ) {
    // Retrieve session key
    APISimulation.getCurrentSessionKey(moodleEndpoint, (err, sessionKey) => {
      if (err) {
        callback(err)
      } else {
        // Delete previous file
        APISimulation.deleteSubmissionFeedbackFile({
          moodleEndpoint: moodleEndpoint,
          itemId: itemId,
          filename: file.name,
          sessionKey: sessionKey
        }, () => {
          if (err) {
            callback(err) // TODO Check if there is other way to treat this call result
          } else {
            APISimulation.addSubmissionFeedbackFile({
              moodleEndpoint: moodleEndpoint,
              file: file,
              sessionKey: sessionKey,
              itemId: itemId,
              contextId: contextId,
              license: license,
              author: author
            }, (err, result) => {
              if (err) {
                callback(err)
              } else {
                callback(null, result)
              }
            })
          }
        })
      }
    })
  }

  static addSubmissionFeedbackFile ({ moodleEndpoint, file, sessionKey, itemId, contextId, license, author }, callback) {
    let formDataJson = new FormData()
    formDataJson.append('repo_upload_file', file)
    formDataJson.append('sesskey', sessionKey)
    formDataJson.append('action', 'upload')
    formDataJson.append('client_id', '5c124b5dd5125')
    formDataJson.append('itemid', itemId)
    formDataJson.append('repo_id', '5') // TODO Check if this one work in all cases (check if necessary)
    formDataJson.append('p', '')
    formDataJson.append('page', '')
    formDataJson.append('env', 'filemanager')
    formDataJson.append('maxbytes', '2097152') // TODO This must be changed according to moodle installation config (check if necessary)
    formDataJson.append('areamaxbytes', '-1')
    formDataJson.append('ctx_id', contextId)
    formDataJson.append('save_path', '/')
    formDataJson.append('license', license)
    formDataJson.append('author', author)
    formDataJson.append('title', '')

    const settings = {
      async: true,
      crossDomain: true,
      url: moodleEndpoint + '/repository/repository_ajax.php',
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'multipart/form-data;'
      },
      params: {
        action: 'upload'
      },
      data: formDataJson
    }
    axios(settings).then((response) => {
      callback(null, response.data)
    })
  }

  static deleteSubmissionFeedbackFile ({ moodleEndpoint, itemId, filename, sessionKey }, callback) {
    let formData = new FormData()

    formData.append('sesskey', sessionKey)
    formData.append('client_id', '5c124b5dd5125')
    formData.append('filepath', '/')
    formData.append('itemid', itemId)
    formData.append('filename', filename)

    let settings = {
      async: true,
      crossDomain: true,
      url: moodleEndpoint + '/repository/draftfiles_ajax.php',
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded;'
      },
      params: {
        action: 'delete'
      },
      data: formData
    }
    axios(settings).then((response) => {
      if (response.filepath) {
        callback(null, true)
      } else {
        callback(new Error('Unable to remove file from moodle'))
      }
    })
  }

  static addSubmissionComment (moodleEndpoint, data, callback) {
    // Retrieve session key
    APISimulation.getCurrentSessionKey(moodleEndpoint, (err, sessionKey) => {
      if (err) {
        callback(err)
      } else {
        // Retrieve client_id for comment
        const settings = {
          async: true,
          crossDomain: true,
          url: moodleEndpoint + '/comment/comment_ajax.php',
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          params: {
            wsfunction: 'mod_assign_save_grade',
            moodlewsrestformat: 'json'
          },
          data: {
            sesskey: sessionKey,
            action: 'add',
            client_id: '5c124b5dd5125', // TODO Check if it works in all moodle versions: It is a random client ID
            itemid: data.itemId,
            area: 'submission_comments',
            courseid: data.courseId,
            contextid: data.contextId,
            component: 'assignsubmission_comments',
            content: data.text
          },
          transformRequest: [(data) => {
            return jsonFormData(data)
          }]
        }
        axios(settings).then((response) => {
          callback(null, response.data)
        })
      }
    })
  }

  static getCurrentSessionKey (moodleEndpoint, callback) {
    const settings = {
      async: true,
      crossDomain: true,
      url: moodleEndpoint + '/my/',
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    }

    axios(settings).then((response) => {
      const parser = new window.DOMParser()
      const docPreferences = parser.parseFromString(response.data, 'text/html')
      const sessionKeyInput = docPreferences.querySelector('input[name="sesskey"]')
      if (_.isElement(sessionKeyInput)) {
        callback(null, sessionKeyInput.value)
      } else {
        callback(new Error('You are not logged in moodle, please login and try it again.'))
      }
    })
  }



  static getClientIdForComment ({ moodleEndpoint, isTeacher, cmid, studentId }, callback) {
    const settings = {
      async: true,
      crossDomain: true,
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    }
    if (isTeacher) {
      settings.url = moodleEndpoint + '/mod/assign/view.php?id=' + cmid + '&rownum=0&action=grader&userid=' + studentId
    } else {
      settings.url = moodleEndpoint + '/mod/assign/view.php?id=' + cmid
    }
    axios(settings).then((response) => {
      const parser = new window.DOMParser()
      const docPreferences = parser.parseFromString(response.data, 'text/html')
      const clientIdContainer = docPreferences.evaluate("//script[contains(., 'client_id')]", document, null, window.XPathResult.ANY_TYPE, null).iterateNext()
      if (clientIdContainer) {
        try {
          const clientId = clientIdContainer.innerText.split('client_id":"')[1].split('","commentarea')[0]
          callback(null, clientId)
        } catch (err) {
          callback(err)
        }
      }
    })
  }

  static removeSubmissionComment () {

  }

  static getSubmissionComments () {

  }

  static constructGetRubricResponse ({ cmid, rubricCriteria, assignmentId, assignmentName = '' }) {
    return {
      areas: [
        {
          cmid: cmid,
          activemethod: 'rubric',
          definitions: [
            {
              id: assignmentId,
              method: 'rubric',
              name: assignmentName,
              rubric: {
                rubric_criteria: rubricCriteria
              }
            }
          ]
        }
      ],
      warnings: []
    }
  }
}

export default APISimulation
