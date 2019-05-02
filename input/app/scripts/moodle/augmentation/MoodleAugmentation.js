const _ = require('lodash')
const MoodleGradingAugmentation = require('./MoodleGradingAugmentation')
const MoodleGraderAugmentation = require('./MoodleGraderAugmentation')

class MoodleAugmentation {
  init () {
    // TODO Check moodle version
    // Get current website
    if ((new URL(window.location)).searchParams.get('action') === 'grader') {
      this.augmentator = new MoodleGraderAugmentation()
    } else if ((new URL(window.location)).searchParams.get('action') === 'grading') {
      this.augmentator = new MoodleGradingAugmentation()
    }
    if (_.isObject(this.augmentator)) {
      this.augmentator.init()
    }
  }
}

module.exports = MoodleAugmentation
