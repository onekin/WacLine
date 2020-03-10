// Enable chromereload by uncommenting this line:
import 'chromereload/devonly'
import 'bootstrap/dist/js/bootstrap'

import Popup from './popup/Popup'

window.addEventListener('load', () => {
  window.popup = new Popup()
  window.popup.init()
})
