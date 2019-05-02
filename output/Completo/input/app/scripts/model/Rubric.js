const AnnotationGuide = require('./AnnotationGuide')
const Criteria = require('./Criteria')
const Level = require('./Level')
const jsYaml = require('js-yaml')
const _ = require('lodash')
const LanguageUtils = require('../utils/LanguageUtils')

class Rubric extends AnnotationGuide {
  constructor ({moodleEndpoint, assignmentId, assignmentName, hypothesisGroup, cmid, courseId}) {
    super({name: assignmentName, hypothesisGroup})
    this.moodleEndpoint = moodleEndpoint
    this.assignmentId = assignmentId
    this.criterias = this.guideElements
    this.cmid = cmid
    this.courseId = courseId
  }

  toAnnotations () {
    let annotations = []
    // Create annotation for current element
    annotations.push(this.toAnnotation())
    // Create annotations for all criterias
    for (let i = 0; i < this.criterias.length; i++) {
      annotations = annotations.concat(this.criterias[i].toAnnotations())
    }
    return annotations
  }

  toAnnotation () {
    return {
      group: this.hypothesisGroup.id,
      permissions: {
        read: ['group:' + this.hypothesisGroup.id]
      },
      references: [],
      tags: ['exam:metadata', 'exam:cmid:' + this.cmid],
      target: [],
      text: jsYaml.dump({
        moodleEndpoint: this.moodleEndpoint,
        assignmentId: this.assignmentId,
        courseId: this.courseId,
        assignmentName: this.name
      }),
      uri: this.hypothesisGroup.links ? this.hypothesisGroup.links.html : this.hypothesisGroup.url // Compatibility with both group representations getGroups and userProfile
    }
  }

  getUrlToStudentAssignmentForTeacher (studentId) {
    if (studentId && this.moodleEndpoint && this.cmid) {
      return this.moodleEndpoint + 'mod/assign/view.php?id=' + this.cmid + '&rownum=0&action=grader&userid=' + studentId
    } else {
      return null
    }
  }

  getUrlToStudentAssignmentForStudent (studentId) {
    if (studentId && this.moodleEndpoint && this.cmid) {
      return this.moodleEndpoint + 'mod/assign/view.php?id=' + this.cmid
    } else {
      return null
    }
  }

  static fromAnnotations (annotations) {
    let rubricAnnotation = _.remove(annotations, (annotation) => {
      return _.some(annotation.tags, (tag) => { return tag === 'exam:metadata' })
    })
    let rubric = Rubric.fromAnnotation(rubricAnnotation[0])
    // TODO Complete the rubric from the annotations
    // For the rest of annotations, get criterias and levels
    let criteriasAnnotations = _.remove(annotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes('exam:criteria:')
      })
    })
    let levelsAnnotations = _.remove(annotations, (annotation) => {
      return _.some(annotation.tags, (tag) => {
        return tag.includes('exam:mark:')
      })
    })
    for (let i = 0; i < criteriasAnnotations.length; i++) {
      let criteria = Criteria.fromAnnotation(criteriasAnnotations[i], rubric)
      if (LanguageUtils.isInstanceOf(criteria, Criteria)) {
        rubric.criterias.push(criteria)
      }
    }
    // Order criterias by criteria id
    rubric.criterias = _.orderBy(rubric.criterias, ['criteriaId'])
    for (let i = 0; i < levelsAnnotations.length; i++) {
      let levelAnnotation = levelsAnnotations[i]
      // Get criteria corresponding to the level
      let levelConfig = jsYaml.load(levelAnnotation.text)
      if (_.isObject(levelConfig) && _.isNumber(levelConfig.criteriaId)) {
        let criteriaId = levelConfig.criteriaId
        let criteria = _.find(rubric.criterias, (criteria) => {
          return criteria.criteriaId === criteriaId
        })
        let level = Level.fromAnnotation(levelAnnotation, criteria)
        criteria.levels.push(level)
      } else {
        console.error('Unable to find criteria for this level annotation')
        console.error(annotations)
      }
    }
    return rubric
  }

  static fromAnnotation (annotation) {
    let config = jsYaml.load(annotation.text)
    let cmidTag = _.find(annotation.tags, (tag) => {
      return tag.includes('exam:cmid:')
    })
    if (_.isString(cmidTag)) {
      config.cmid = cmidTag.replace('exam:cmid:', '')
    }
    config.assignmentName = config.assignmentName || window.abwa.groupSelector.currentGroup.name
    config.hypothesisGroup = window.abwa.groupSelector.currentGroup
    return new Rubric(config)
  }

  static createRubricFromObject (rubric) {
    // Instance rubric object
    let instancedRubric = Object.assign(new Rubric({moodleEndpoint: 'http://ss.com', assignmentName: 'aa'}), rubric)
    // Instance criterias and levels
    for (let i = 0; i < rubric.criterias.length; i++) {
      instancedRubric.criterias[i] = Criteria.createCriteriaFromObject(rubric.criterias[i], instancedRubric)
    }
    return instancedRubric
  }
}

module.exports = Rubric
