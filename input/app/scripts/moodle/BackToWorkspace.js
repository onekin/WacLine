import _ from 'lodash'
import RolesManager from '../contentScript/RolesManager'

class BackToWorkspace {
  static createWorkspaceLink (callback) {
    this.linkToWorkspace = document.createElement('a')
    if (window.abwa.codebookManager.codebookReader.codebook) {
      const rubric = window.abwa.codebookManager.codebookReader.codebook
      const studentId = window.abwa.targetManager.fileMetadata.studentId
      // PVSCL:IFCOND(MoodleResource, LINE)
      if (window.abwa.rolesManager.role === RolesManager.roles.producer) {
        this.linkToWorkspace.href = rubric.moodleEndpoint + 'mod/assign/view.php?id=' + rubric.cmid + '&rownum=0&action=grader&userid=' + studentId
      } else {
        this.linkToWorkspace.href = rubric.moodleEndpoint + 'mod/assign/view.php?id=' + rubric.cmid
      }
      // PVSCL:ENDCOND
      this.linkToWorkspace.target = '_blank'
    }
    if (_.isFunction(callback)) {
      callback(this.linkToWorkspace)
    }
  }
}

export default BackToWorkspace
