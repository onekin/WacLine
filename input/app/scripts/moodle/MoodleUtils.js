import CryptoUtils from '../utils/CryptoUtils'

class MoodleUtils {
  static createURLForAnnotation ({ annotation, studentId, courseId, cmid }) {
    return annotation.target[0].source.url + '#studentId:' + studentId + '&mag:' + annotation.id + '&courseId:' + courseId + '&cmid:' + cmid
  }

  static getHashedGroup ({ studentId, moodleEndpoint, courseId }) {
    const groupName = moodleEndpoint + courseId + '-' + studentId
    // We create a hash using the course ID and the student ID to anonymize the Hypothes.is group
    return 'MG' + CryptoUtils.hash(groupName).substring(0, 23)
  }
}

export default MoodleUtils
