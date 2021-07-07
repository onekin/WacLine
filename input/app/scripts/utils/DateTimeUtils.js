import _ from 'lodash'

class DateTimeUtils {
  static getYearMonthDay (date) {
    if (!date) {
      date = new Date()
    }
    let dd = date.getDate()
    let mm = date.getMonth() + 1 // January is 0!

    const yyyy = date.getFullYear()
    if (dd < 10) {
      dd = '0' + dd
    }
    if (mm < 10) {
      mm = '0' + mm
    }
    return dd + '/' + mm + '/' + yyyy
  }

  static getHumanReadableTimeFromUnixTimeInMiliseconds (unixTime) {
    if (!_.isNumber(unixTime) || _.isNaN(unixTime)) {
      return new Error('Unable to parse unix time.')
    } else {
      let date = new Date(unixTime)
      let hours = Math.floor(unixTime / 1000 / 60 / 24)
      if (hours > 0) {
        return hours + ' hours'
      }
      let minutes = date.getMinutes()
      if (minutes > 0) {
        return minutes + ' mins.'
      }
      let seconds = date.getSeconds()
      if (seconds > 0) {
        return seconds + ' secs.'
      }
      return 0
    }
  }
}

export default DateTimeUtils
