const MoodleClientManager = require('../../moodle/MoodleClientManager')
const MoodleUtils = require('../../moodle/MoodleUtils')
const _ = require('lodash')
const Config = require('../../Config')
// const linkifyUrls = require('linkify-urls')

class MoodleReport {
  constructor () {
    this.moodleClientManager = null
    this.events = {}
  }

  init (callback) {
    console.debug('Initializing moodle report')
    this.moodleClientManager = new MoodleClientManager(window.abwa.tagManager.model.highlighterDefinition.moodleEndpoint)
    this.moodleClientManager.init(() => {
      if (_.isFunction(callback)) {
        console.debug('Initialized moodle report')
        callback()
      }
    })
  }

  updateMoodleFromMarks (annotatedThemes, callback) {
    // Get all code annotations
    let annotations = []
    for (let i = 0; i < annotatedThemes.length; i++) {
      let themeId = annotatedThemes[i].theme.id
      let currentlyAnnotatedCode = window.abwa.annotatedContentManager.searchAnnotatedCodeForGivenThemeId(themeId)
      if (currentlyAnnotatedCode) {
        let codeAnnotaions = currentlyAnnotatedCode.annotations
        annotations.push(codeAnnotaions)
      }
    }
    annotations = _.flatten(annotations)
    // let annotations = _.flatten(_.map(annotatedThemes, annotatedTheme => annotatedTheme.annotations))
    // Get student id
    let studentId = window.abwa.targetManager.fileMetadata.studentId
    // Filter from search only the annotations which are used to classify and are from this cmid
    let cmid = window.abwa.tagManager.model.highlighterDefinition.cmid
    annotations = _.filter(annotations, (anno) => {
      return anno.uri !== window.abwa.groupSelector.currentGroup.links.html &&
        _.find(anno.tags, (tag) => {
          return tag === 'cmid:' + cmid
        })
    })
    let marks = _.map(annotations, (annotation) => {
      let criteriaName = _.find(annotation.tags, (tag) => {
        return tag.includes(Config.namespace + ':' + Config.tags.grouped.relation + ':')
      }).replace(Config.namespace + ':' + Config.tags.grouped.relation + ':', '')
      let levelName = _.find(annotation.tags, (tag) => {
        return tag.includes(Config.namespace + ':' + Config.tags.grouped.subgroup + ':')
      })
      if (levelName) {
        levelName = levelName.replace(Config.namespace + ':' + Config.tags.grouped.subgroup + ':', '')
      } else {
        levelName = null
      }
      let url = MoodleUtils.createURLForAnnotation({annotation, studentId, courseId: window.abwa.tagManager.model.highlighterDefinition.courseId, cmid: cmid})
      // Construct feedback
      let text = annotation.text
      let feedbackCommentElement = ''
      if (text) {
        /* let urlizedText = linkifyUrls(text, {
          attributes: {
            target: '_blank'
          }
        }) */
        let urlizedText = text
        let quoteSelector = _.find(annotation.target[0].selector, (selector) => { return selector.type === 'TextQuoteSelector' })
        if (quoteSelector) {
          feedbackCommentElement = '<b>' + urlizedText + '</b><br/><a href="' + url + '">See in context</a>'
        }
      } else {
        feedbackCommentElement = '<b>-</b><br/><a href="' + url + '">See in context</a>'
      }
      return {criteriaName, levelName, text, url, feedbackCommentElement}
    })
    console.log(marks)
    // Reorder criterias as same as are presented in rubric
    let sortingArr = _.map(window.abwa.tagManager.model.highlighterDefinition.themes, 'name')
    marks.slice().sort((a, b) => {
      return sortingArr.indexOf(a.criteriaName) - sortingArr.indexOf(b.criteriaName)
    })
    console.log(marks)
    // Get for each criteria name and mark its corresponding criterionId and level from window.abwa.rubric
    let criterionAndLevels = this.getCriterionAndLevel(marks)
    let feedbackComment = this.getFeedbackComment(marks)
    // Compose moodle data
    let moodleGradingData = this.composeMoodleGradingData({
      criterionAndLevels,
      userId: studentId,
      assignmentId: window.abwa.tagManager.model.highlighterDefinition.assignmentId,
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
    let annotationGuide = window.abwa.tagManager.model.highlighterDefinition
    let criterionAndLevel = []
    for (let i = 0; i < marks.length; i++) {
      let mark = marks[i]
      let criteria = _.find(annotationGuide.themes, (theme) => {
        return theme.name === mark.criteriaName
      })
      let level = _.find(criteria.codes, (code) => {
        return code.name === mark.levelName
      })
      if (_.isUndefined(level)) {
        level = {levelId: -1}
      }
      let remark = mark.text
      criterionAndLevel.push({criterionId: criteria.moodleCriteriaId, levelid: level.moodleLevelId, remark})
    }
    console.log(criterionAndLevel)
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
      'attemptnumber': '-1',
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

module.exports = MoodleReport
