const MoodleClient = require('./MoodleClient')

let moodleClient = new MoodleClient('', '')

const MoodleFunctions = {
  updateStudentsGradeWithRubric: {
    wsFunc: 'mod_assign_save_grade',
    testParams: {},
    clientFunc: moodleClient.updateStudentGradeWithRubric
  },
  getRubric: {
    wsFunc: 'core_grading_get_definitions',
    testParams: '0',
    clientFunc: moodleClient.getRubric
  },
  getStudents: {
    wsFunc: 'core_enrol_get_enrolled_users',
    testParams: '0',
    clientFunc: moodleClient.getStudents
  },
  getCourseModuleInfo: {
    wsFunc: 'core_course_get_course_module',
    testParams: {},
    clientFunc: moodleClient.getCmidInfo
  }
}

module.exports = MoodleFunctions
