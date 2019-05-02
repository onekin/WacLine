class SheetUtils {
  static columnToLetter (columnNumber) {
    let temp = ''
    let letter = ''
    while (columnNumber > 0) {
      temp = (columnNumber - 1) % 26
      letter = String.fromCharCode(temp + 65) + letter
      columnNumber = (columnNumber - temp - 1) / 26
    }
    return letter
  }
}

module.exports = SheetUtils
