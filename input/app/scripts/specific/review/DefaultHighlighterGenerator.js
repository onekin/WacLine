const Config = require('../../Config')
const DefaultCriterias = require('./DefaultCriterias')
const Review = require('../../model/schema/Review')

class DefaultHighlighterGenerator {
  static createReviewHypothesisGroup (callback) {
    window.abwa.hypothesisClientManager.hypothesisClient.createNewGroup({name: Config.review.groupName}, callback)
  }

  static createDefaultAnnotations (hypothesisGroup, callback) {
    // Create review schema from default criterias
    let review = Review.fromCriterias(DefaultCriterias.criteria)
    review.hypothesisGroup = hypothesisGroup
    // Create highlighter annotations
    let annotations = review.toAnnotations()
    // Send create highlighter
    window.abwa.hypothesisClientManager.hypothesisClient.createNewAnnotations(annotations, (err, annotations) => {
      callback(err, annotations)
    })
  }
}

module.exports = DefaultHighlighterGenerator
