/* from react-dropdown-select */

import React from 'react'
import PropTypes from 'prop-types'

function ClickOutside({onClickOutside, ...props}) {
  const containerRef = React.createRef()

  function handleClick(event) {
    const container = containerRef.current
    const {target} = event

    if ((container && container === target) || (container && !container.contains(target))) {
      onClickOutside(event)
    }
  }

  React.useEffect(() => {
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  })

  return <div ref={containerRef} {...props} />
}

ClickOutside.propTypes = {
  onClickOutside: PropTypes.func.isRequired
}

export default ClickOutside