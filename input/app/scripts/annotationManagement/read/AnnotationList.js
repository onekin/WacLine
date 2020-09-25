class AnnotationList {
  static openAnnotationList () {
    // Get current annotation server
    const selectedAnnotationServerManager = window.abwa.annotationServerManager

    // Get current annotation group
    const currentGroupId = window.abwa.groupSelector.currentGroup.id

    // Redirect depending on the annotation server and parametrize with the current group ID
    const url = selectedAnnotationServerManager.constructSearchUrl({ group: currentGroupId })
    window.open(url, '_blank')
  }
}

export default AnnotationList
