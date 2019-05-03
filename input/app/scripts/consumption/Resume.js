class Resume {
  static resume () {
    if (window.abwa.contentAnnotator.allAnnotations.length > 0) window.abwa.contentAnnotator.goToAnnotation(window.abwa.contentAnnotator.allAnnotations.reduce((max, a) => new Date(a.updated) > new Date(max.updated) ? a : max))
  }
}

module.exports = Resume
