const ColorUtils = require('../utils/ColorUtils')

class TagGroup {
  constructor (config, tags) {
    this.config = config
    this.tags = tags || []
    this.config.color = this.config.color || 'rgba(150,150,150,0.5)'
  }

  getColor () {
    return ColorUtils.setAlphaToColor(this.config.color, 0.3)
  }
}

module.exports = TagGroup
