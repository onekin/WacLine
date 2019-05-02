const AnnotationGuide = require('./AnnotationGuide')
const Criteria = require('./Criteria')
const Level = require('./Level')

class Review extends AnnotationGuide {
  constructor ({reviewId, hypothesisGroup}) {
    super({name: reviewId, hypothesisGroup})
    this.criterias = this.guideElements
  }

  toAnnotations () {
    let annotations = []
    // Create annotations for all criterias
    for (let i = 0; i < this.criterias.length; i++) {
      annotations = annotations.concat(this.criterias[i].toAnnotations())
    }
    return annotations
  }

  static fromCriterias (criterias) {
    let review = new Review({reviewId: ''})
    for (let i = 0; i < criterias.length; i++) {
      let criteria = new Criteria({name: criterias[i].name, description: criterias[i].description, group: criterias[i].group, review})
      criteria.levels = []
      for (let j = 0; j < criterias[i].levels.length; j++) {
        let level = new Level({name: criterias[i].levels[j].name, criteria: criteria})
        criteria.levels.push(level)
      }
      review.criterias.push(criteria)
    }
    return review
  }
}

module.exports = Review
