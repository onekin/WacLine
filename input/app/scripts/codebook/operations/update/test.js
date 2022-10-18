import { JSDOM } from 'jsdom';
import ImageUtilsUtils from "../../../utils/ImageUtilsOCR.js"

let main = async () => {
  let dom = new JSDOM('<!DOCTYPE html>'), document = dom.window.document;
  const irudi = document.createElement("img")
  irudi.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Equation_illustration_colour.svg/220px-Equation_illustration_colour.svg.png'
  let retrievedThemeName = await ImageUtilsUtils.getStringFromImage(irudi)
  console.log(retrievedThemeName)
}

main()
