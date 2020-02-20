(() => {
  let fileToLoad = (new URL(document.location)).searchParams.get('file')

  function reqListener () {
    document.querySelector('pre').innerText = this.responseText
  }

  let oReq = new XMLHttpRequest()
  oReq.addEventListener('load', reqListener)
  oReq.open('GET', fileToLoad)
  oReq.send()
})()
