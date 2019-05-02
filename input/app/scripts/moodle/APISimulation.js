const axios = require('axios')
const _ = require('lodash')
const jsonFormData = require('json-form-data')

class APISimulation {
  static getRubric (cmids, callback) {
    // TODO Verify that cmids is not an array
    // TODO Go to task main page
    let taskMainPageUrl = window.mag.moodleContentScript.moodleEndpoint + 'mod/assign/view.php?id=' + cmids
    axios.get(taskMainPageUrl)
      .then((response) => {
        let parser = new window.DOMParser()
        let docPreferences = parser.parseFromString(response.data, 'text/html')
        let rubricURLElement = docPreferences.querySelector('a[href*="grade/grading/manage.php?"]')
        if (rubricURLElement) {
          // TODO Go to rubric page
          let rubricURL = rubricURLElement.href
          axios.get(rubricURL)
            .then((response) => {
              let parser = new window.DOMParser()
              let docPreferences = parser.parseFromString(response.data, 'text/html')
              let rubricTable = docPreferences.querySelector('#rubric-criteria')
              // TODO Get each criterion
              let rubricCriteria = APISimulation.getRubricCriteriaFromRubricTable(rubricTable)
              let assignmentId = APISimulation.getAssignmentId(docPreferences)
              let assignmentName = APISimulation.getAssignmentName(docPreferences)
              // For each criterion
              let formattedRubric = APISimulation.constructGetRubricResponse({rubricCriteria, cmid: cmids, assignmentId, assignmentName})
              callback(null, formattedRubric)
            })
        } else {
          // TODO Unable to retrieve rubric url
        }
      })
    // TODO Get table of rubrics
  }

  static getAssignmentName () {
    // TODO Get assignment name
    return null
  }

  static getRubricCriteriaFromRubricTable (rubricTable) {
    let criterionElements = rubricTable.querySelectorAll('.criterion')
    let criterias = []
    for (let i = 0; i < criterionElements.length; i++) {
      let criterionElement = criterionElements[i]
      let criteria = {}
      // Get id
      criteria.id = parseInt(_.last(criterionElement.id.split('-')))
      criteria.sortorder = i + 1
      criteria.description = criterionElement.querySelector('.description').innerText
      criteria.descriptionformat = 1 // The one by default is 1
      let levelElements = criterionElement.querySelectorAll('.level')
      let levels = []
      for (let j = 0; j < levelElements.length; j++) {
        let levelElement = levelElements[j]
        let level = {}
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
    let deleteformElement = document.querySelector('a[href*="deleteform"]')
    if (deleteformElement) {
      let url = new URL(deleteformElement.href)
      return url.searchParams.get('deleteform')
    } else {
      return null
    }
  }

  static addSubmissionComment (moodleEndpoint, data, callback) {
    // Retrieve session key
    APISimulation.getCurrentSessionKey(moodleEndpoint, (err, sessionKey) => {
      if (err) {
        callback(err)
      } else {
        // Retrieve client_id for comment
        /* APISimulation.getClientIdForComment({
          moodleEndpoint, cmid: data.cmid, studentId: data.studentId, isTeacher: data.isTeacher
        }, (err, clientId) => {

        }) */
        let settings = {
          'async': true,
          'crossDomain': true,
          'url': moodleEndpoint + '/comment/comment_ajax.php',
          'method': 'POST',
          'headers': {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          'params': {
            'wsfunction': 'mod_assign_save_grade',
            'moodlewsrestformat': 'json'
          },
          'data': {
            'sesskey': sessionKey,
            'action': 'add',
            'client_id': '5c124b5dd5125', // TODO Check if it works in all moodle versions: It is a random client ID
            'itemid': data.itemId,
            'area': 'submission_comments',
            'courseid': data.courseId,
            'contextid': data.contextId,
            'component': 'assignsubmission_comments',
            'content': data.text
          },
          'transformRequest': [(data) => {
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
    let settings = {
      'async': true,
      'crossDomain': true,
      'url': moodleEndpoint + '/my/',
      'method': 'GET',
      'headers': {
        'Cache-Control': 'no-cache'
      }
    }

    axios(settings).then((response) => {
      let parser = new window.DOMParser()
      let docPreferences = parser.parseFromString(response.data, 'text/html')
      let sessionKeyInput = docPreferences.querySelector('input[name="sesskey"]')
      if (_.isElement(sessionKeyInput)) {
        callback(null, sessionKeyInput.value)
      } else {
        callback(new Error('You are not logged in moodle, please login and try it again.'))
      }
    })
  }

  static getClientIdForComment ({moodleEndpoint, isTeacher, cmid, studentId}, callback) {
    let settings = {
      'async': true,
      'crossDomain': true,
      'method': 'GET',
      'headers': {
        'Cache-Control': 'no-cache'
      }
    }
    if (isTeacher) {
      settings.url = moodleEndpoint + '/mod/assign/view.php?id=' + cmid + '&rownum=0&action=grader&userid=' + studentId
    } else {
      settings.url = moodleEndpoint + '/mod/assign/view.php?id=' + cmid
    }
    axios(settings).then((response) => {
      let parser = new window.DOMParser()
      let docPreferences = parser.parseFromString(response.data, 'text/html')
      let clientIdContainer = docPreferences.evaluate("//script[contains(., 'client_id')]", document, null, window.XPathResult.ANY_TYPE, null).iterateNext()
      if (clientIdContainer) {
        try {
          let clientId = clientIdContainer.innerText.split('client_id":"')[1].split('","commentarea')[0]
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

  static constructGetRubricResponse ({cmid, rubricCriteria, assignmentId, assignmentName = ''}) {
    return {
      'areas': [
        {
          'cmid': cmid,
          'activemethod': 'rubric',
          'definitions': [
            {
              'id': assignmentId,
              'method': 'rubric',
              'name': assignmentName,
              'rubric': {
                'rubric_criteria': rubricCriteria
              }
            }
          ]
        }
      ],
      'warnings': []
    }
  }
}

module.exports = APISimulation
