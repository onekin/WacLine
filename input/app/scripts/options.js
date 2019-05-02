// Enable chromereload by uncommenting this line:
// import 'chromereload/devonly'

const Options = require('./options/Options')

window.addEventListener('load', (event) => {
  window.options = new Options()
  window.options.init()
})
