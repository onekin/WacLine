import Tesseract from 'tesseract.js'

// const img = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Equation_illustration_colour.svg/220px-Equation_illustration_colour.svg.png"

class ImageUtilsOCR {
  static getStringFromImage (imgElement) {
    console.log(imgElement.src)
    return Tesseract.recognize(
      imgElement.src,
      'eng',
      { logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
      return text
    })
  }
}


export default ImageUtilsOCR
