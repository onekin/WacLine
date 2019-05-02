const GuideElement = require('./GuideElement')
const jsYaml = require('js-yaml')
const _ = require('lodash')
const Level = require('./Level')
const LanguageUtils = require('../utils/LanguageUtils')

class Criteria extends GuideElement {
  constructor ({name, color, criteriaId, rubric}) {
    super({name, color, parentElement: rubric})
    this.criteriaId = criteriaId
    this.levels = this.childElements
    this.rubric = this.parentElement
  }

  toAnnotations () {
    let annotations = []
    // Create its annotations
    annotations.push(this.toAnnotation())
    // Create its children annotations
    for (let i = 0; i < this.levels.length; i++) {
      annotations = annotations.concat(this.levels[i].toAnnotations())
    }
    return annotations
  }

  toAnnotation () {
    let rubric = this.getAncestor()
    return {
      group: rubric.hypothesisGroup.id,
      permissions: {
        read: ['group:' + rubric.hypothesisGroup.id]
      },
      references: [],
      tags: ['exam:criteria:' + LanguageUtils.normalizeString(this.name), 'exam:cmid:' + rubric.cmid],
      target: [],
      text: jsYaml.dump({criteriaId: this.criteriaId}),
      uri: rubric.hypothesisGroup.links ? rubric.hypothesisGroup.links.html : rubric.hypothesisGroup.url // Compatibility with both group representations getGroups and userProfile
    }
  }

  static fromAnnotations (annotations) {

  }

  static fromAnnotation (annotation, rubric = {}) {
    let criteriaTag = _.find(annotation.tags, (tag) => {
      return tag.includes('exam:criteria:')
    })
    if (_.isString(criteriaTag)) {
      let name = criteriaTag.replace('exam:criteria:', '')
      let config = jsYaml.load(annotation.text)
      if (_.isObject(config)) {
        let criteriaId = config.criteriaId
        return new Criteria({name, criteriaId, rubric})
      } else {

      }
    } else {
      console.error('Unable to retrieve criteria from annotation')
    }
  }

  static createCriteriaFromObject (criteria, rubric) {
    criteria.parentElement = rubric
    criteria.rubric = criteria.parentElement
    // Instance criteria object
    let instancedCriteria = Object.assign(new Criteria({}), criteria)
    // Instance levels
    for (let i = 0; i < criteria.levels.length; i++) {
      instancedCriteria.levels[i] = Level.createLevelFromObject(criteria.levels[i], instancedCriteria)
    }
    return instancedCriteria
  }
}

module.exports = Criteria
