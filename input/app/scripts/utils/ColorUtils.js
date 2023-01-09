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

  static getDimensionColor (dimensions) {
    const cmapCloudColors = [
      'rgba(255,150,200)',
      'rgba(255,255,150)',
      'rgba(200,255,200)',
      'rgba(150,200,255)',
      'rgba(255,200,0)',
      'rgba(200,150,255)',
      'rgba(0,200,255)',
      'rgba(150,200,0)',
      'rgba(255,150,0)',
      'rgba(200,200,200)',
      'rgba(255,0,255)',
      'rgba(0,255,0)'
    ]
    let usedColors = ColorUtils.getUsedColors(dimensions)
    if (usedColors.length > 0) {
      let remainColors = cmapCloudColors.filter(val => !usedColors.includes(val))
      return remainColors[0]
    } else {
      return cmapCloudColors[0]
    }
  }

  static getTopicColor () {
    return 'rgba(239,109,121)'
  }

  static getUsedColors (dimensions) {
    let usedColors = []
    if (dimensions) {
      dimensions.forEach(dimension => {
        let color = dimension.color.replace(', 0.6)', ')').replaceAll(' ', '')
        usedColors.push(color)
      })
    }

    return usedColors
  }

  static turnForCmapCloud (color) {
    let cmapCloudColor = color.replace(', 0.6)', '').replaceAll(' ', '').replace('rgba(', '').replace(')', '')
    cmapCloudColor = cmapCloudColor + ',255'

    return cmapCloudColor
  }

  static getColorFromCXLFormat (cmapCloudColor) {
    let color = 'rgba(' + cmapCloudColor
    color = ColorUtils.replaceLast(color, '255', '0.6)')
    return color
  }

  static replaceLast (str, pattern, replacement) {
    const match =
      typeof pattern === 'string'
        ? pattern
        : (str.match(new RegExp(pattern.source, 'g')) || []).slice(-1)[0]
    if (!match) return str
    const last = str.lastIndexOf(match)
    return last !== -1
      ? `${str.slice(0, last)}${replacement}${str.slice(last + match.length)}`
      : str
  }


}

export default ColorUtils
