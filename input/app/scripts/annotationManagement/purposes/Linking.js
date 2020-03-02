const Body = require('./Body')

class Linking extends Body {
  constructor ({purpose = Linking.purpose, fromValue, toValue, linkingWordValue}) {
    super(purpose)
    this.fromValue = fromValue
    this.toValue = toValue
    this.linkingWordValue = linkingWordValue
  }

  populate (fromValue, toValue, linkingWordValue) {
    this.fromValue = fromValue
    this.toValue = toValue
    this.linkingWordValue = linkingWordValue
  }

  serialize () {
    return {purpose: this.purpose, fromValue: this.fromValue, toValue: this.toValue, linkingWordValue: this.linkingWordValue}
  }

  tooltip () {
    return this.fromValue + ' ' + this.linkingWordValue + ' ' + this.toValue
  }
}

Linking.purpose = 'linking'

module.exports = Linking
