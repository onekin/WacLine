import MoodleClientManager from '../../moodle/MoodleClientManager'
import MoodleUtils from '../../moodle/MoodleUtils'
import Alerts from '../../utils/Alerts'
import _ from 'lodash'
import Config from '../../Config'
import Events from '../../Events'
import Commenting from '../purposes/Commenting'
import APISimulation from '../../moodle/APISimulation'
// PVSCL:IFCOND(TXT, LINE)
import TXT from '../../target/formats/TXT'
import AnnotatedFileGeneration from './AnnotatedFileGeneration'
// PVSCL:ENDCOND
// const linkifyUrls = require('linkify-urls')

class MoodleReport {
  constructor () {
    this.moodleClientManager = null
    this.events = {}
  }

  init (callback) {
    console.debug('Initializing moodle report')
    this.moodleClientManager = new MoodleClientManager(window.abwa.codebookManager.codebookReader.codebook.moodleEndpoint)
    this.moodleClientManager.init(() => {
      if (_.isFunction(callback)) {
        console.debug('Initialized moodle report')
        callback()
      }
    })
    // Listens when annotation is created, updated, deleted or codeToAll
    this.initEventListeners()
    // Get preferences for moodle report behaviour
    this.getPreferencesForMoodleReport()
  }

  initEventListeners (callback) {
    this.events.annotatedContentManagerUpdatedEvent = { element: document, event: Events.annotatedContentManagerUpdated, handler: this.createUpdateMoodleReportEventListener() }
    this.events.annotatedContentManagerUpdatedEvent.element.addEventListener(this.events.annotatedContentManagerUpdatedEvent.event, this.events.annotatedContentManagerUpdatedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  /**
   * This function creates an event listener which will handle moodle report functionality. This includes: marks and feedback report comment generation and optionally file upload for plain-text-like files
   * @returns {function(): void}
   */
  createUpdateMoodleReportEventListener () {
    return () => {
      // Check if user has marked automatic file upload functionality
      chrome.runtime.sendMessage({ scope: 'moodle', cmd: 'isMoodleUploadAnnotatedFilesActivated' }, (isActivated) => {
        let feedbackFileSubmissionPromise
        if (isActivated.activated) {
          // Generate and upload annotated file in moodle
          feedbackFileSubmissionPromise = window.abwa.moodleReport.uploadAnnotatedFileToMoodle()
        } else {
          feedbackFileSubmissionPromise = Promise.resolve({ fileItemId: null })
        }
        // Update moodle marks from annotations
        feedbackFileSubmissionPromise.then(({ fileItemId }) => {
          window.abwa.moodleReport.updateMoodleRubricAndReport({ fileItemId })
        })
      })
    }
  }

  uploadAnnotatedFileToMoodle () {
    return new Promise((resolve, reject) => {
      (async () => {
        // TODO Retrieve teacher's preference for uploaded feedback files' license
        let license = 'unknown'
        // TODO Retrieve file submission file's author (teacher name in Moodle)
        let author = 'Teacher Teacher'
        // TODO Retrieve fileItemId (the file container for current student-assignment pair)
        let fileItemId = window.abwa.targetManager.fileMetadata.feedbackFileItemId
        if (fileItemId) { // The teacher has enabled feedback file submission in moodle assigment
          // Generate submission file
          let feedbackFile
          try {
            feedbackFile = await window.abwa.moodleReport.generateFileFromCurrentDocument()
          } catch (e) {
            resolve({ fileItemId: null })
          }
          // Upload file to the corresponding file area
          APISimulation.updateFeedbackSubmissionFile(window.abwa.codebookManager.codebookReader.codebook.moodleEndpoint, {
            contextId: window.abwa.targetManager.fileMetadata.contextId,
            itemId: fileItemId,
            file: feedbackFile,
            author: author,
            license: license
          }, () => {
            resolve({ fileItemId: fileItemId })
          })
        } else {
          // Teacher has enabled in annotation tool the option to automatically upload, but has not enabled in moodle feedback file submission
          resolve({ fileItemId: null })
        }
      })().catch(e => {
        reject(e)
      })
    })
  }

  generateFileFromCurrentDocument () {
    return new Promise((resolve, reject) => {
      if (window.abwa.targetManager.documentFormat === TXT) {
        AnnotatedFileGeneration.generateAnnotatedFileForPlainTextFile((err, fileInStringFormat) => {
          if (err) {
            reject(err)
          } else {
            resolve(new File([fileInStringFormat], window.abwa.targetManager.fileName + '_annotated.html' || 'activity_annotated.html', { type: 'text/html' }))
          }
        })
      } else { // TODO Look if worth to implement the same functionality for PDF documents
        reject(new Error('Current file type is not compatible'))
      }
    })
  }

  updateMoodleRubricAndReport ({ fileItemId }) {
    const annotatedThemes = window.abwa.annotatedContentManager.annotatedThemes
    window.abwa.moodleReport.updateMoodleFromMarks({ annotatedThemes, fileItemId }, (err) => {
      if (err) {
        Alerts.errorAlert({
          text: 'Unable to push marks to moodle, please make sure that you are logged in Moodle and try it again.' + chrome.i18n.getMessage('ContactAdministrator', [err.message, err.stack]),
          title: 'Unable to update marks in moodle'
        })
      } else {
        if (this.moodleUpdateNotificationEnabled) {
          Alerts.temporalAlert({
            text: 'Every change is updated in Moodle',
            title: 'Correctly updated in Moodle',
            type: Alerts.alertType.success,
            toast: true
          })
        }
      }
    })
  }

  updateMoodleFromMarks ({ annotatedThemes, fileItemId }, callback) {
    // Get all code annotations
    let annotations = []
    for (let i = 0; i < annotatedThemes.length; i++) {
      const themeId = annotatedThemes[i].theme.id
      const currentlyAnnotatedCode = window.abwa.annotatedContentManager.searchAnnotatedCodeForGivenThemeId(themeId)
      if (currentlyAnnotatedCode) {
        const codeAnnotaions = currentlyAnnotatedCode.annotations
        annotations.push(codeAnnotaions)
      }
    }
    annotations = _.flatten(annotations)
    // let annotations = _.flatten(_.map(annotatedThemes, annotatedTheme => annotatedTheme.annotations))
    // Get student id
    const studentId = window.abwa.targetManager.fileMetadata.studentId
    // Filter from search only the annotations which are used to classify and are from this cmid
    const cmid = window.abwa.codebookManager.codebookReader.codebook.cmid
    annotations = _.filter(annotations, (anno) => {
      return anno.uri !== window.abwa.groupSelector.currentGroup.links.html &&
        _.find(anno.tags, (tag) => {
          return tag === 'cmid:' + cmid
        })
    })
    const marks = _.map(annotations, (annotation) => {
      const criteriaName = _.find(annotation.tags, (tag) => {
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
      // Get max level
      let maxLevelName
      try {
        const theme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(annotation.body.find(body => body.purpose === 'classifying').value.theme.id)
        maxLevelName = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(theme.id).maxCode().name
      } catch (e) {
        maxLevelName = null
      }
      const url = MoodleUtils.createURLForAnnotation({ annotation, studentId, courseId: window.abwa.codebookManager.codebookReader.codebook.courseId, cmid: cmid })
      // Construct feedback
      // Add the comment
      const comment = annotation.getBodyForPurpose(Commenting.purpose)
      const text = comment ? comment.value : ''
      let feedbackCommentElement = ''
      if (text) {
        feedbackCommentElement += '<b>' + text + '</b><br/>'
      } else {
        feedbackCommentElement = '<b>-</b><br/>'
      }
      // Add the quote of annotated fragment
      const quoteSelector = _.find(annotation.target[0].selector, (selector) => { return selector.type === 'TextQuoteSelector' })
      if (quoteSelector) {
        feedbackCommentElement += '<i><a href="' + url + '">' + quoteSelector.exact + '</a></i>'
      } else {
        feedbackCommentElement += '<a href="' + url + '">See in context</a>'
      }
      // Add page where annotation is
      let fragmentSelector = annotation.target[0].selector.find(selector => selector.type === 'FragmentSelector')
      if (fragmentSelector && _.has(fragmentSelector, 'page')) {
        feedbackCommentElement += '[Page: ' + fragmentSelector.page + ']'
      }
      return { criteriaName, levelName, maxLevelName, text, url, feedbackCommentElement }
    })
    console.debug(marks)
    // Reorder criterias as same as are presented in rubric
    const sortingArr = _.map(window.abwa.codebookManager.codebookReader.codebook.themes, 'name')
    marks.slice().sort((a, b) => {
      return sortingArr.indexOf(a.criteriaName) - sortingArr.indexOf(b.criteriaName)
    })
    console.debug(marks)
    // Get for each criteria name and mark its corresponding criterionId and level from window.abwa.rubric
    const criterionAndLevels = this.getCriterionAndLevel(marks)
    const feedbackComment = this.getFeedbackComment(marks)
    // Compose moodle data
    const moodleGradingData = this.composeMoodleGradingData({
      criterionAndLevels,
      userId: studentId,
      assignmentId: window.abwa.codebookManager.codebookReader.codebook.assignmentId,
      feedbackComment: feedbackComment,
      fileItemId
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
    const annotationGuide = window.abwa.codebookManager.codebookReader.codebook
    const criterionAndLevel = []
    for (let i = 0; i < marks.length; i++) {
      const mark = marks[i]
      const criteria = _.find(annotationGuide.themes, (theme) => {
        return theme.name === mark.criteriaName
      })
      let level = _.find(criteria.codes, (code) => {
        return code.name === mark.levelName
      })
      if (_.isUndefined(level)) {
        level = { levelId: -1 }
      }
      const remark = mark.text
      criterionAndLevel.push({ criterionId: criteria.moodleCriteriaId, levelid: level.moodleLevelId, remark })
    }
    console.debug(criterionAndLevel)
    const resultingMarks = {}
    // TODO Append links if shared
    // Merge remarks with same criterionId and append remark
    _.forEach(criterionAndLevel, (crit) => {
      const remark = _.has(resultingMarks[crit.criterionId], 'remark') ? resultingMarks[crit.criterionId].remark + '\n\n' + crit.remark : crit.remark
      const levelid = crit.levelid
      resultingMarks[crit.criterionId] = { remark: remark, levelid: levelid }
    })
    // Convert merge object to an array
    return _.map(resultingMarks, (mark, key) => { return { criterionId: key, levelid: mark.levelid, remark: mark.remark } })
  }

  getFeedbackComment (marks) {
    let feedbackComment = ''
    const groupedMarksArray = _.values(_.groupBy(marks, 'criteriaName'))
    _.forEach(groupedMarksArray, (markGroup) => {
      // Criteria + level
      const criteria = markGroup[0].criteriaName
      const levelId = markGroup[0].levelName
      const maxLevelName = markGroup[0].maxLevelName
      feedbackComment += '<h3>Criterion: ' + criteria + ' - Mark: ' + levelId + '/' + maxLevelName + '</h3><br/>'
      // Comments
      _.forEach(markGroup, (mark) => {
        feedbackComment += mark.feedbackCommentElement + '<br/><br/>'
      })
      // hr
      feedbackComment += '<hr/>'
    })
    feedbackComment += '<hr/><h3>How to see feedback in your assignment?</h3><ul>' +
      '<li><a target="_blank" href="' + window.abwa.groupSelector.currentGroup.links.html + '">Join feedback group</a></li>' +
      '<li><a target="_blank" href="https://chrome.google.com/webstore/detail/markgo/kjedcndgienemldgjpjjnhjdhfoaocfa">Install Mark&Go</a></li>' +
      '</ul>' // TODO i18n
    return feedbackComment
  }

  composeMoodleGradingData ({ criterionAndLevels, userId, assignmentId, feedbackComment, fileItemId }) {
    const rubric = { criteria: [] }
    for (let i = 0; i < criterionAndLevels.length; i++) {
      const criterionAndLevel = criterionAndLevels[i]
      if (criterionAndLevel.levelid > -1) { // If it is -1, the student is not grade for this criteria
        rubric.criteria.push({
          criterionid: criterionAndLevel.criterionId,
          fillings: [
            {
              criterionid: '0',
              levelid: criterionAndLevel.levelid,
              remark: criterionAndLevel.remark,
              remarkformat: 1
            }
          ]
        })
      }
    }
    let plugindata = {
      assignfeedbackcomments_editor: {
        format: '1', // HTML
        text: feedbackComment
      }
    }
    if (fileItemId) {
      plugindata.files_filemanager = fileItemId
    }
    return {
      userid: userId + '',
      assignmentid: assignmentId,
      attemptnumber: '-1',
      addattempt: 1,
      workflowstate: '',
      applytoall: 1,
      grade: '0',
      advancedgradingdata: { rubric: rubric },
      plugindata: plugindata
    }
  }

  destroy (callback) {
    // Remove the event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }

  getPreferencesForMoodleReport () {
    // Get preferences for moodle update notification
    chrome.runtime.sendMessage({ scope: 'moodle', cmd: 'isMoodleUpdateNotificationActivated' }, (isActivated) => {
      this.moodleUpdateNotificationEnabled = _.isBoolean(isActivated.activated) ? isActivated.activated : true
    })
  }
}

export default MoodleReport
