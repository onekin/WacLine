const _ = require('lodash')
const MoodleGradingAugmentation = require('./MoodleGradingAugmentation')
const MoodleGraderAugmentation = require('./MoodleGraderAugmentation')
const MoodleViewPluginAssignSubmissionAugmentation = require('./MoodleViewPluginAssignSubmissionAugmentation')

class MoodleAugmentation {
  init () {
    // TODO Check moodle version
    // Get current website
    if ((new URL(window.location)).searchParams.get('action') === 'grader') {
      this.augmentator = new MoodleGraderAugmentation()
    } else if ((new URL(window.location)).searchParams.get('action') === 'grading') {
      this.augmentator = new MoodleGradingAugmentation()
    } else if ((new URL(window.location).searchParams.get('action') === 'viewpluginassignsubmission')) {
      this.augmentator = new MoodleViewPluginAssignSubmissionAugmentation()
    }
    if (_.isObject(this.augmentator)) {
      this.augmentator.init()
    }
  }
}

module.exports = MoodleAugmentation
