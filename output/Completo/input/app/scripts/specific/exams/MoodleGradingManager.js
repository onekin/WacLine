const MoodleClientManager = require('../../moodle/MoodleClientManager')
const MoodleUtils = require('../../moodle/MoodleUtils')
const _ = require('lodash')
const linkifyUrls = require('linkify-urls')

class MoodleGradingManager {
  constructor () {
    this.moodleClientManager = null
    this.events = {}
  }

  init (callback) {
    this.moodleClientManager = new MoodleClientManager(window.abwa.rubricManager.rubric.moodleEndpoint)
    this.moodleClientManager.init(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  updateMoodleFromMarks (toUpdateMarks, callback) {
    // Get annotations
    let annotations = _.flatten(_.map(toUpdateMarks, mark => mark.annotations))
    // Get student id
    let studentId = window.abwa.contentTypeManager.fileMetadata.studentId
    // Filter from search only the annotations which are used to classify and are from this cmid
    let cmid = window.abwa.rubricManager.rubric.cmid
    annotations = _.filter(annotations, (anno) => {
      return anno.uri !== window.abwa.groupSelector.currentGroup.links.html &&
        _.find(anno.tags, (tag) => {
          return tag === 'exam:cmid:' + cmid
        })
    })
    let marks = _.map(annotations, (annotation) => {
      let criteriaName = _.find(annotation.tags, (tag) => {
        return tag.includes('exam:isCriteriaOf:')
      }).replace('exam:isCriteriaOf:', '')
      let levelName = _.find(annotation.tags, (tag) => {
        return tag.includes('exam:mark:')
      })
      if (levelName) {
        levelName = levelName.replace('exam:mark:', '')
      } else {
        levelName = null
      }
      let url = MoodleUtils.createURLForAnnotation({annotation, studentId, courseId: window.abwa.rubricManager.rubric.courseId, cmid: window.abwa.rubricManager.rubric.cmid})
      // Construct feedback
      let text = annotation.text
      let feedbackCommentElement = ''
      if (text) {
        let urlizedText = linkifyUrls(text, {
          attributes: {
            target: '_blank'
          }
        })
        let quoteSelector = _.find(annotation.target[0].selector, (selector) => { return selector.type === 'TextQuoteSelector' })
        if (quoteSelector) {
          feedbackCommentElement = '<b>' + urlizedText + '</b><br/><a href="' + url + '">See in context</a>'
        }
      } else {
        feedbackCommentElement = '<b>-</b><br/><a href="' + url + '">See in context</a>'
      }
      return {criteriaName, levelName, text, url, feedbackCommentElement}
    })
    // Reorder criterias as same as are presented in rubric
    let sortingArr = _.map(window.abwa.rubricManager.rubric.criterias, 'name')
    marks.slice().sort((a, b) => {
      return sortingArr.indexOf(a.criteriaName) - sortingArr.indexOf(b.criteriaName)
    })
    // Get for each criteria name and mark its corresponding criterionId and level from window.abwa.rubric
    let criterionAndLevels = this.getCriterionAndLevel(marks)
    let feedbackComment = this.getFeedbackComment(marks)
    // Compose moodle data
    let moodleGradingData = this.composeMoodleGradingData({
      criterionAndLevels,
      userId: studentId,
      assignmentId: window.abwa.rubricManager.rubric.assignmentId,
      feedbackComment: feedbackComment
    })
    // Update student grading in moodle
    this.moodleClientManager.updateStudentGradeWithRubric(moodleGradingData, (err) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    })
  }

  getCriterionAndLevel (marks) {
    let rubric = window.abwa.rubricManager.rubric
    let criterionAndLevel = []
    for (let i = 0; i < marks.length; i++) {
      let mark = marks[i]
      let criteria = _.find(rubric.criterias, (criteria) => {
        return criteria.name === mark.criteriaName
      })
      let level = _.find(criteria.levels, (level) => {
        return level.name === mark.levelName
      })
      if (_.isUndefined(level)) {
        level = {levelId: -1}
      }
      let remark = mark.text
      criterionAndLevel.push({criterionId: criteria.criteriaId, levelid: level.levelId, remark})
    }
    let resultingMarks = {}
    // TODO Append links if shared
    // Merge remarks with same criterionId and append remark
    _.forEach(criterionAndLevel, (crit) => {
      let remark = _.has(resultingMarks[crit.criterionId], 'remark') ? resultingMarks[crit.criterionId]['remark'] + '\n\n' + crit.remark : crit.remark
      let levelid = crit.levelid
      resultingMarks[crit.criterionId] = {remark: remark, levelid: levelid}
    })
    // Convert merge object to an array
    return _.map(resultingMarks, (mark, key) => { return {criterionId: key, levelid: mark.levelid, remark: mark.remark} })
  }

  getFeedbackComment (marks) {
    let feedbackComment = '<h2>How to see feedback in your assignment?</h2><ul>' +
      '<li><a target="_blank" href="https://chrome.google.com/webstore/detail/markgo/kjedcndgienemldgjpjjnhjdhfoaocfa">Install Mark&Go</a></li>' +
      '<li><a target="_blank" href="' + window.abwa.groupSelector.currentGroup.links.html + '">Join feedback group</a></li>' +
      '</ul><hr/>' // TODO i18n
    let groupedMarksArray = _.values(_.groupBy(marks, 'criteriaName'))
    _.forEach(groupedMarksArray, (markGroup) => {
      // Criteria + level
      let criteria = markGroup[0].criteriaName
      let levelId = markGroup[0].levelName
      feedbackComment += '<h3>Criteria: ' + criteria + ' - Mark: ' + levelId + '</h3><br/>'
      // Comments
      _.forEach(markGroup, (mark) => {
        feedbackComment += mark.feedbackCommentElement + '<br/>'
      })
      // hr
      feedbackComment += '<hr/>'
    })
    return feedbackComment
  }

  composeMoodleGradingData ({criterionAndLevels, userId, assignmentId, feedbackComment}) {
    let rubric = {criteria: []}
    for (let i = 0; i < criterionAndLevels.length; i++) {
      let criterionAndLevel = criterionAndLevels[i]
      if (criterionAndLevel.levelid > -1) { // If it is -1, the student is not grade for this criteria
        rubric.criteria.push({
          'criterionid': criterionAndLevel.criterionId,
          'fillings': [
            {
              'criterionid': '0',
              'levelid': criterionAndLevel.levelid,
              'remark': criterionAndLevel.remark,
              'remarkformat': 1
            }
          ]
        })
      }
    }
    return {
      'userid': userId + '',
      'assignmentid': assignmentId,
      'attemptnumber': '0',
      'addattempt': 1,
      'workflowstate': '',
      'applytoall': 1,
      'grade': '0',
      'advancedgradingdata': { rubric: rubric },
      'plugindata': {
        'assignfeedbackcomments_editor': {
          'format': '1', // HTML
          'text': feedbackComment
        }
      }
    }
  }

  destroy (callback) {
    // Remove the event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

module.exports = MoodleGradingManager
