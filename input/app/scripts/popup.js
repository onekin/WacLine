// Enable chromereload by uncommenting this line:
import 'chromereload/devonly'

const Popup = require('./popup/Popup')

window.addEventListener('load', (event) => {
  window.popup = new Popup()
  window.popup.init()
})
