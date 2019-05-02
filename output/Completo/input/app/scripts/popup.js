// Enable chromereload by uncommenting this line:
import 'chromereload/devonly'
import 'bootstrap/dist/js/bootstrap'

const Popup = require('./popup/Popup')

window.addEventListener('load', (event) => {
  window.popup = new Popup()
  window.popup.init()
})
