import Tesseract from 'tesseract.js'

class ImageUtils {
  static getStringFromImage (imgElement) {
    return Tesseract.recognize(
      imgElement.src,
      'eng',
      { logger: m => console.log(m),
        oem: 1,
        psm: 3}
    ).then(({ data: { text } }) => {
        return text
    })
  }

}

export default ImageUtils
