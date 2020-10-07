import React from 'react'
import PropTypes from 'prop-types'

const ClickOutside = React.forwardRef(({onClickOutside, ...props}, ref) => {
	//const containerRef = React.createRef();

	function handleClick(event) {
		const container = ref && ref.current
		const {target} = event

		if ((container && container === target) || (container && !container.contains(target))) {
		 	onClickOutside(event)
		}
	}

	React.useEffect(() => {
		document.addEventListener('click', handleClick, true)
		return () => document.removeEventListener('click', handleClick, true)
	})

	return <div ref={ref} {...props} />
})

ClickOutside.propTypes = {
	onClickOutside: PropTypes.func.isRequired
}

export default ClickOutside
