import tesseract from "node-tesseract-ocr"

const config = {
  lang: "eng",
  oem: 1,
  psm: 3,
}
// const img = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Equation_illustration_colour.svg/220px-Equation_illustration_colour.svg.png"

class ImageUtils {
  static getStringFromImage (imgElement) {
    return tesseract
      .recognize(imgElement.src, config)
      .then((text) => {
        return text
      })
      .catch((error) => {
        console.log(error.message)
      })
  }}


export default ImageUtils
