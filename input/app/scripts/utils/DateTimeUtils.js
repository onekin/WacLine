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
      return Math.floor(unixTime / 1000 / 60 / 24) + 'h' + date.getMinutes() + 'm' + date.getSeconds() + 's'
    }
  }
}

export default DateTimeUtils
