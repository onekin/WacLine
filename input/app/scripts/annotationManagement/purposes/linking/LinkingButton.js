import LinkingForm from './LinkingForm'

class LinkingButton {
  static createNewLinkButton () {
    let newLinkingButton = document.createElement('button')
    newLinkingButton.innerText = 'New relation'
    newLinkingButton.id = 'newRelationButton'
    newLinkingButton.className = 'tagButton codingElement'
    newLinkingButton.addEventListener('click', () => {
      let annotation
      LinkingForm.showLinkingForm(annotation, (err, annotation) => {
        if (err) {
          // Alerts.errorAlert({text: 'Unexpected error when commenting. Please reload webpage and try again. Error: ' + err.message})
        } else {
          /* LanguageUtils.dispatchCustomEvent(Events.updateAnnotation, {
            annotation: annotation
          }) */
        }
      })
    })
    window.abwa.codebookManager.codebookReader.buttonContainer.append(newLinkingButton)
  }
}

export default LinkingButton
