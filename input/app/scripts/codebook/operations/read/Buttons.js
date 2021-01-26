import $ from 'jquery'
import _ from 'lodash'
import ColorUtils from '../../../utils/ColorUtils'
if (!$.contextMenu) {
  require('jquery-contextmenu/dist/jquery.contextMenu')
}

/**
 * A class to collect functionality to create buttons and groups of buttons for the sidebar
 */
class Buttons {
  static createGroupedButtons ({ id, name, label, data, className, description, color = 'white', childGuideElements, groupHandler, buttonHandler, groupTemplate, groupRightClickHandler, buttonRightClickHandler, ondragstart, ondragover, ondrop }) {
    if (id) {
      let tagGroup
      // Create the container
      if (!groupTemplate) {
        groupTemplate = document.querySelector('#tagGroupTemplate')
        if (!_.isElement(groupTemplate)) {
          tagGroup = document.createElement('div')
          tagGroup.className = 'tagGroup'
          if (className) {
            tagGroup.className += ' ' + className
          }
          // Group name container
          const groupNameContainer = document.createElement('div')
          groupNameContainer.className = 'groupNameContainer'
          // Group name label
          const groupName = document.createElement('div')
          groupName.className = 'groupName'
          groupNameContainer.appendChild(groupName)
          // Create collapse button
          const collapseToogle = document.createElement('span')
          collapseToogle.className = 'collapseToggle'
          collapseToogle.addEventListener('click', () => {
            const tagGroup = document.querySelector('.tagGroup[data-code-id="' + id + '"]')
            if (tagGroup.getAttribute('aria-expanded') === 'false') {
              tagGroup.setAttribute('aria-expanded', 'true')
            } else {
              tagGroup.setAttribute('aria-expanded', 'false')
            }
          })
          groupNameContainer.appendChild(collapseToogle)
          tagGroup.appendChild(groupNameContainer)
          const tagButtonContainer = document.createElement('div')
          tagButtonContainer.className = 'tagButtonContainer'
          tagGroup.appendChild(tagButtonContainer)
        } else {
          tagGroup = $(groupTemplate.content.firstElementChild).clone().get(0)
        }
      } else {
        tagGroup = $(groupTemplate.content.firstElementChild).clone().get(0)
      }
      if (_.isFunction(data)) {
        const dataResult = data({ codeId: id })
        _.forEach(_.toPairs(dataResult), (pair) => { tagGroup.dataset[pair[0]] = pair[1] })
      }
      tagGroup.dataset.codeName = name
      tagGroup.dataset.codeId = id
      const tagButtonContainer = $(tagGroup).find('.tagButtonContainer')
      const groupNameSpan = tagGroup.querySelector('.groupName')
      const groupNameContainer = tagGroup.querySelector('.groupNameContainer')
      if (_.isFunction(label)) {
        groupNameSpan.innerText = label({ codeId: id, codeName: name })
      } else {
        groupNameSpan.innerText = name
      }
      if (description) {
        groupNameSpan.title = name + ': ' + description
      } else {
        groupNameSpan.title = name
      }
      groupNameContainer.style.backgroundColor = color
      groupNameSpan.dataset.baseColor = color
      // Create event handler for tag group
      groupNameSpan.addEventListener('click', groupHandler)
      // Tag button background color change
      // TODO It should be better to set it as a CSS property, but currently there is not an option for that
      groupNameContainer.addEventListener('mouseenter', () => {
        const currentColor = ColorUtils.colorFromString(groupNameContainer.style.backgroundColor)
        if (currentColor.valpha) {
          if (currentColor.alpha(currentColor.valpha + 0.2).isDark()) {
            groupNameSpan.style.color = 'white'
          }
          groupNameContainer.style.backgroundColor = ColorUtils.setAlphaToColor(ColorUtils.colorFromString(groupNameSpan.dataset.baseColor), currentColor.valpha + 0.2)
        } else {
          groupNameContainer.style.backgroundColor = ColorUtils.setAlphaToColor(ColorUtils.colorFromString(groupNameSpan.dataset.baseColor), 0.7)
        }
      })
      groupNameContainer.addEventListener('mouseleave', () => {
        if (groupNameSpan.dataset.chosen === 'true') {
          groupNameContainer.style.backgroundColor = ColorUtils.setAlphaToColor(ColorUtils.colorFromString(groupNameSpan.dataset.baseColor), 0.6)
        } else {
          groupNameSpan.style.color = ''
          groupNameContainer.style.backgroundColor = groupNameSpan.dataset.baseColor
        }
      })
      // Set button right click handler
      if (_.isFunction(groupRightClickHandler)) {
        Buttons.createGroupRightClickHandler({ id, className, handler: groupRightClickHandler })
      }
      // Drag and drop functions
      if (_.isFunction(ondragstart)) {
        tagGroup.draggable = true
        // On drag start function
        tagGroup.addEventListener('dragstart', Buttons.createDragStartHandler(id, ondragstart))
      }
      if (_.isFunction(ondragover)) {
        // On dragover function
        tagGroup.addEventListener('dragover', (event) => {
          event.stopPropagation()
          tagGroup.style.backgroundColor = 'rgba(150,150,150,0.5)'
        })
        tagGroup.addEventListener('dragleave', (event) => {
          event.stopPropagation()
          tagGroup.style.backgroundColor = ''
        })
      }
      if (_.isFunction(ondrop)) {
        tagGroup.addEventListener('dragover', (event) => {
          event.stopPropagation()
          event.preventDefault()
        })
        // On drop function
        groupNameSpan.addEventListener('drop', Buttons.createDropHandler({
          id,
          handler: ondrop,
          beforeDrop: () => {
            tagGroup.style.backgroundColor = ''
          }
        }))
      }
      // Create buttons and add to the container
      if (_.isArray(childGuideElements) && childGuideElements.length > 0) { // Only create group containers for groups which have elements
        for (let i = 0; i < childGuideElements.length; i++) {
          const element = childGuideElements[i]
          if (element.childElements && element.childElements.length > 0) {
            const groupButton = Buttons.createGroupedButtons({
              id: element.id,
              name: element.name,
              className: className,
              label: label,
              data: data,
              childGuideElements: element.childElements,
              color: element.color,
              groupHandler: groupHandler,
              buttonHandler: buttonHandler,
              groupRightClickHandler: groupRightClickHandler,
              buttonRightClickHandler: buttonRightClickHandler,
              ondragstart,
              ondragover,
              ondrop
            })
            tagButtonContainer.append(groupButton)
          } else {
            const button = Buttons.createButton({
              id: element.id,
              name: element.name,
              label: label,
              data: data,
              className: className,
              description: element.description,
              color: element.color,
              handler: buttonHandler,
              buttonRightClickHandler: buttonRightClickHandler,
              ondragstart,
              ondragover,
              ondrop
            })
            tagButtonContainer.append(button)
          }
        }
      }
      return tagGroup
    } else {
      throw new Error('Group button must have an unique id')
    }
  }

  static createGroupRightClickHandler ({ id, className = 'tagGroup', handler }) {
    $.contextMenu({
      selector: '.' + className + '[data-code-id="' + id + '"] > .groupNameContainer > .groupName',
      build: () => {
        return handler(id)
      }
    })
  }

  static createButtonRightClickHandler ({ id, className = 'tagButton', handler }) {
    $.contextMenu({
      selector: '.' + className + '[data-code-id="' + id + '"]',
      build: () => {
        return handler(id)
      }
    })
  }

  static createDragStartHandler (id, handler) {
    return (event) => {
      event.stopPropagation()
      if (_.isFunction(handler)) {
        handler(event, id)
      }
    }
  }

  static createDropHandler ({ id, handler, beforeDrop }) {
    return (event) => {
      if (_.isFunction(beforeDrop)) {
        beforeDrop()
      }
      event.preventDefault()
      event.stopPropagation()
      if (_.isFunction(handler)) {
        handler(event, id)
      }
    }
  }

  static createButton ({ id, name, label, data, className, color = 'rgba(200, 200, 200, 1)', description, handler, buttonTemplate, buttonRightClickHandler, ondragstart, ondragover, ondrop }) {
    if (id) {
      let tagButton
      // Create the container
      if (!buttonTemplate) {
        buttonTemplate = document.querySelector('#tagGroupTemplate')
        if (!_.isElement(buttonTemplate)) {
          tagButton = document.createElement('button')
          tagButton.className = 'tagButton'
          if (className) {
            tagButton.className += ' ' + className
          }
        }
      } else {
        $(buttonTemplate.content.firstElementChild).clone().get(0)
      }
      if (_.isFunction(data)) {
        const dataResult = data({ codeId: id })
        _.forEach(_.toPairs(dataResult), (pair) => { tagButton.dataset[pair[0]] = pair[1] })
      }
      tagButton.dataset.codeName = name
      tagButton.dataset.codeId = id
      if (_.isFunction(label)) {
        tagButton.innerText = label({ codeId: id, codeName: name })
      } else {
        tagButton.innerText = name
      }
      if (description) {
        tagButton.title = name + ': ' + description
      } else {
        tagButton.title = name
      }
      tagButton.dataset.mark = name
      if (color) {
        $(tagButton).css('background-color', color)
        tagButton.dataset.baseColor = color
      }
      // Set handler for button
      tagButton.addEventListener('click', handler)
      // Set button right click handler
      if (_.isFunction(buttonRightClickHandler)) {
        Buttons.createButtonRightClickHandler({ id, className, handler: buttonRightClickHandler })
      }
      // Drag and drop functions
      if (_.isFunction(ondragstart)) {
        tagButton.draggable = true
        // On drag start function
        tagButton.addEventListener('dragstart', Buttons.createDragStartHandler(id, ondragstart))
      }
      if (_.isFunction(ondragover)) {
        // On dragover function
        tagButton.addEventListener('dragenter', (event) => {
          event.stopPropagation()
          tagButton.style.backgroundColor = 'rgba(150,150,150,0.5)'
        })
        tagButton.addEventListener('dragleave', (event) => {
          event.stopPropagation()
          if (tagButton.dataset.chosen === 'true') {
            tagButton.style.backgroundColor = ColorUtils.setAlphaToColor(ColorUtils.colorFromString(tagButton.dataset.baseColor), 0.6)
          } else {
            tagButton.style.backgroundColor = tagButton.dataset.baseColor
          }
        })
      }
      if (_.isFunction(ondrop)) {
        // Prevent dragover
        tagButton.addEventListener('dragover', (e) => {
          e.preventDefault()
          e.stopPropagation()
        })
        // On drop function
        tagButton.addEventListener('drop', Buttons.createDropHandler({
          id,
          handler: ondrop,
          beforeDrop: () => {
            if (tagButton.dataset.chosen === 'true') {
              tagButton.style.backgroundColor = ColorUtils.setAlphaToColor(ColorUtils.colorFromString(tagButton.dataset.baseColor), 0.6)
            } else {
              tagButton.style.backgroundColor = tagButton.dataset.baseColor
            }
          }
        }))
      }
      // Tag button background color change
      // TODO It should be better to set it as a CSS property, but currently there is not an option for that
      tagButton.addEventListener('mouseenter', () => {
        const currentColor = ColorUtils.colorFromString(tagButton.style.backgroundColor)
        if (currentColor.valpha) {
          if (currentColor.opaquer(0.2).isDark()) {
            tagButton.style.color = 'white'
          }
          tagButton.style.backgroundColor = ColorUtils.setAlphaToColor(ColorUtils.colorFromString(tagButton.dataset.baseColor), currentColor.valpha + 0.2)
        } else {
          tagButton.style.backgroundColor = ColorUtils.setAlphaToColor(ColorUtils.colorFromString(tagButton.dataset.baseColor), 0.7)
        }
      })
      tagButton.addEventListener('mouseleave', () => {
        tagButton.style.color = ''
        if (tagButton.dataset.chosen === 'true') {
          tagButton.style.backgroundColor = ColorUtils.setAlphaToColor(ColorUtils.colorFromString(tagButton.dataset.baseColor), 0.6)
        } else {
          tagButton.style.backgroundColor = tagButton.dataset.baseColor
        }
      })
      return tagButton
    } else {
      throw new Error('Button must have an unique id')
    }
  }
}

export default Buttons
