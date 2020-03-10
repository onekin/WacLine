class AnnotationList {
  static openAnnotationList () {
    // Get current annotation server
    let selectedAnnotationServerManager = window.abwa.annotationServerManager

    // Get current annotation group
    let currentGroupId = window.abwa.groupSelector.currentGroup.id

    // Redirect depending on the annotation server and parametrize with the current group ID
    let url = selectedAnnotationServerManager.constructSearchUrl({group: currentGroupId})
    window.open(url, '_blank')
  }
}

export default AnnotationList
