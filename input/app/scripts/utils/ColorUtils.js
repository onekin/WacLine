import ColorHash from 'color-hash'
import Color from 'color'
import UniqueColors from 'unique-colors'

class ColorUtils {
  static getDefaultColor () {
    return 'rgba(150,150,150,0.5)'
  }

  static getRandomColor () {
    const red = (Math.floor(Math.random() * 256))
    const green = (Math.floor(Math.random() * 256))
    const blue = (Math.floor(Math.random() * 256))
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
    const colorHash = new ColorHash({ hash: ColorUtils.customHash })
    const resultArray = colorHash.rgb(text)
    const alphaValue = alpha || 0.5
    return 'rgba(' + resultArray[0] + ',' + resultArray[1] + ',' + resultArray[2] + ', ' + alphaValue + ')'
  }

  static setAlphaToColor (color, alpha) {
    return Color(color).alpha(alpha).rgb().string()
  }

  static customHash (str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash += char
    }
    return hash
  }

  static hasAlpha (str) {
    const color = new Color(str)
    return color.valpha !== 1
  }

  static getDifferentColors (number) {
    return UniqueColors.unique_colors(number)
  }
}

export default ColorUtils
