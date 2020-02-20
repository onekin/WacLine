class MoodleUtils {
  static createURLForAnnotation ({annotation, studentId, courseId, cmid}) {
    return annotation.target[0].source.url + '#studentId:' + studentId + '&mag:' + annotation.id + '&courseId:' + courseId + '&cmid:' + cmid
  }
}

module.exports = MoodleUtils
