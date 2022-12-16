// import AnnotationBasedInitializer from './contentScript/AnnotationBasedInitializer'
// import ContentScriptManager from './contentScript/ContentScriptManager'
// import _ from 'lodash'



let kudeatzaileakHasieratu = function () {
  let checkDOM = setInterval(function () {
    let lista = document.getElementById('actions')
    let luList = document.getElementById('actions').getElementsByTagName('ul')
    let clone = luList[0].firstChild.cloneNode(true)
    if (clone.nodeName !== '#comment') {
      clone.firstChild.innerHTML = 'Import from Concept&Go'
      lista.children[0].appendChild(clone)
      clearInterval(checkDOM)
    }
  }, 1000)
}

window.onload = kudeatzaileakHasieratu
