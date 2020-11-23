import axios from 'axios'
import _ from 'lodash'
import jsonFormData from 'json-form-data'

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

  static addFeedbackSubmissionFile (moodleEndpoint, data, callback) {
    // Retrieve session key
    APISimulation.getCurrentSessionKey(moodleEndpoint, (err, sessionKey) => {
      if (err) {
        callback(err)
      } else {
        let formdata = new FormData()
        formdata.append('repo_upload_file', data.file)
        formdata.append('sesskey', sessionKey)
        formdata.append('action', 'upload')
        formdata.append('client_id', '5c124b5dd5125')
        formdata.append('itemid', data.itemId)
        formdata.append('repo_id', 5)
        formdata.append('p', '')
        formdata.append('page', '')
        formdata.append('env', 'filemanager')
        formdata.append('maxbytes', 2097152)
        formdata.append('areamaxbytes', -1)
        formdata.append('ctx_id', data.contextId)
        formdata.append('save_path', '/')
        formdata.append('license', data.license)
        formdata.append('author', data.author)
        formdata.append('title', '')

        let urlencodeFormData = (fd) => {
          let s = ''

          function encode (s) { return encodeURIComponent(s).replace(/%20/g, '+'); }

          for (let pair of fd.entries()) {
            if (typeof pair[1] === 'string') {
              s += (s ? '&' : '') + encode(pair[0]) + '=' + encode(pair[1])
            }
          }
          return s
        }

        let data = "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"repo_upload_file\"; filename=\"aaa.txt\"\n" +
          "Content-Type: text/plain\n" +
          "\n" +
          "aaa\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"title\"\n" +
          "\n" +
          "\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"author\"\n" +
          "\n" +
          "Teacher Teacher\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"license\"\n" +
          "\n" +
          "unknown\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"itemid\"\n" +
          "\n" +
          "47539863\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"repo_id\"\n" +
          "\n" +
          "5\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"p\"\n" +
          "\n" +
          "\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"page\"\n" +
          "\n" +
          "\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"env\"\n" +
          "\n" +
          "filemanager\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"sesskey\"\n" +
          "\n" +
          "lPMnreHTPw\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"client_id\"\n" +
          "\n" +
          "5fb654e6bd5ad\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"itemid\"\n" +
          "\n" +
          "47539863\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"maxbytes\"\n" +
          "\n" +
          "2097152\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"areamaxbytes\"\n" +
          "\n" +
          "-1\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"ctx_id\"\n" +
          "\n" +
          "40\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx\n" +
          "Content-Disposition: form-data; name=\"savepath\"\n" +
          "\n" +
          "/\n" +
          "------WebKitFormBoundary0XEZCHtnAA7tVzOx--\n"

        const settings = {
          async: true,
          crossDomain: true,
          url: moodleEndpoint + '/repository/repository_ajax.php',
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          params: {
            wsfunction: 'mod_assign_save_grade',
            moodlewsrestformat: 'json'
          },
          /* data: {
            sesskey: sessionKey,
            action: 'upload',
            client_id: '5c124b5dd5125', // TODO Check if it works in all moodle versions: It is a random client ID
            itemid: data.itemId,
            repo_id: 5,
            p: '',
            page: '',
            env: 'filemanager',
            maxbytes: 2097152,
            areamaxbytes: -1,
            ctx_id: data.contextId,
            save_path: '/',
            license: data.license,
            author: data.author,
            title: '',
            repo_upload_file: data.file
          },
          transformRequest: [(data) => {
            return jsonFormData(data)
          }] */
          data: urlencodeFormData(formdata)
        }
        axios(settings).then((response) => {
          callback(null, response.data)
        })
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
        /* APISimulation.getClientIdForComment({
          moodleEndpoint, cmid: data.cmid, studentId: data.studentId, isTeacher: data.isTeacher
        }, (err, clientId) => {

        }) */
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
