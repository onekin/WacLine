class MoodleUtils {
  static createURLForAnnotation ({annotation, studentId, courseId, cmid}) {
    return annotation.uri + '#studentId:' + studentId + '&mag:' + annotation.id + '&courseId:' + courseId + '&cmid:' + cmid
  }
}

module.exports = MoodleUtils
