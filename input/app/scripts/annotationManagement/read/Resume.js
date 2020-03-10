class Resume {
  static resume () {
    if (window.abwa.annotationManagement.annotationReader.allAnnotations.length > 0) {
      window.abwa.annotationManagement.goToAnnotation(window.abwa.annotationManagement.annotationReader.allAnnotations.reduce(
        (max, a) => a.modified > max.modified ? a : max)
      )
    }
  }
}

export default Resume
