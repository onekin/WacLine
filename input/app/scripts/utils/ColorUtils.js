import ColorHash from 'color-hash'
import Color from 'color'
import UniqueColors from 'unique-colors'

class ColorUtils {
  static getDefaultColor () {
    return 'rgba(150,150,150,0.5)'
  }

  static getRandomColor () {
    let red = (Math.floor(Math.random() * 256))
    let green = (Math.floor(Math.random() * 256))
    let blue = (Math.floor(Math.random() * 256))
    let alpha = Math.random()
    if (alpha < 0.5) {
      alpha = 0.5
    }
    return 'rgba(' + red + ',' + green + ',' + blue + ', ' + alpha + ')'
  }

  static colorFromString (str) {
    return new Color(str)
  }

  static getHashColor (text, alpha) {
    let colorHash = new ColorHash({hash: ColorUtils.customHash})
    let resultArray = colorHash.rgb(text)
    let alphaValue = alpha || 0.5
    return 'rgba(' + resultArray[0] + ',' + resultArray[1] + ',' + resultArray[2] + ', ' + alphaValue + ')'
  }

  static setAlphaToColor (color, alpha) {
    return Color(color).alpha(alpha).rgb().string()
  }

  static customHash (str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      let char = str.charCodeAt(i)
      hash += char
    }
    return hash
  }

  static hasAlpha (str) {
    let color = new Color(str)
    return color.valpha !== 1
  }

  static getDifferentColors (number) {
    return UniqueColors.unique_colors(number)
  }
}

export default ColorUtils
