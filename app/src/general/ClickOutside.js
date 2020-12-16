import PropTypes from 'prop-types'
import React from 'react'

const ClickOutside = React.forwardRef(({onClickOutside, ...props}, ref) => {
	const newRef = React.useRef();
	const containerRef = ref || newRef;

	function handleClick(event) {
		const container = containerRef.current;
		const {target} = event;

		if ((container && container === target) || (container && !container.contains(target))) {
		 	onClickOutside(event)
		}
	}

	React.useEffect(() => {
		document.addEventListener('mousedown', handleClick, true);
		return () => document.removeEventListener('mousedown', handleClick, true)
	})

	return <div ref={containerRef} {...props} />
})

ClickOutside.propTypes = {
	onClickOutside: PropTypes.func.isRequired
}

export default ClickOutside
