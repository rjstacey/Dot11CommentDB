/* from react-dropdown-select */

import React from 'react'
import PropTypes from 'prop-types'

function ClickOutside(props) {
  const containerRef = React.createRef()

  function handleClick(event) {
    const container = containerRef.current
    const {target} = event
    const {onClickOutside} = props

    if ((container && container === target) || (container && !container.contains(target))) {
      onClickOutside(event)
    }
  }

  React.useEffect(() => {
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  })

  const {className, children} = props
  return (
    <div className={className} ref={containerRef}>
      {children}
    </div>
  )
}

ClickOutside.propTypes = {
  onClickOutside: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string
}

export default ClickOutside