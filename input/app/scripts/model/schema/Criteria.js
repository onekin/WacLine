const GuideElement = require('./GuideElement')
const jsYaml = require('js-yaml')
const _ = require('lodash')
const Level = require('./Level')
const LanguageUtils = require('../../utils/LanguageUtils')

class Criteria extends GuideElement {
  constructor ({name, color, review, group = 'Other', description, custom = false}) {
    super({name, color, parentElement: review})
    this.levels = this.childElements
    this.group = group
    this.review = this.parentElement
    this.description = description
    this.custom = custom
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
    let review = this.getAncestor()
    return {
      group: review.hypothesisGroup.id,
      permissions: {
        read: ['group:' + review.hypothesisGroup.id]
      },
      references: [],
      tags: ['review:criteria:' + LanguageUtils.normalizeString(this.name)],
      target: [],
      text: jsYaml.dump({
        description: this.description,
        group: this.group,
        custom: this.custom
      }),
      uri: review.hypothesisGroup.links ? review.hypothesisGroup.links.html : review.hypothesisGroup.url // Compatibility with both group representations getGroups and userProfile
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
