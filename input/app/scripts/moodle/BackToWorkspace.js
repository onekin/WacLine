const _ = require('lodash')

class BackToWorkspace {
  static createWorkspaceLink (callback) {
    this.linkToWorkspace = document.createElement('a')
    if (window.abwa.tagManager.model.highlighterDefinition) {
      let rubric = window.abwa.tagManager.model.highlighterDefinition
      let studentId = window.abwa.contentTypeManager.fileMetadata.studentId
      this.linkToWorkspace.href = rubric.moodleEndpoint + 'mod/assign/view.php?id=' + rubric.cmid + '&rownum=0&action=grader&userid=' + studentId
      this.linkToWorkspace.target = '_blank'
    }
    if (_.isFunction(callback)) {
      callback(this.linkToWorkspace)
    }
  }
}

module.exports = BackToWorkspace
