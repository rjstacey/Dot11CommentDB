import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'
import useClickOutside from '../lib/useClickOutside'
import {ActionButton} from '../general/Icons'

const Wrapper = styled.div`
	display: inline-block;
	position: relative;
	user-select: none;
`;

const DropdownContainer = styled.div`
	position: absolute;
	right: 0;
	top: 28px;
	padding: 10px;
	display: flex;
	flex-direction: column;
	background: #fff;
	border: 1px solid #ccc;
	border-radius: 5px;
	box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
	z-index: 9;
	overflow: auto;
	box-sizing: border-box;
	:focus {outline: none}
`;

function ActionButtonDropdown({
	style,
	className,
	name,
	title,
	disabled,
	children
}) {
	const [isOpen, setOpen] = React.useState(false);
	const wrapperRef = React.useRef();
	const dropdownRef = React.useRef();
	const [dropdownStyle, setDropdownStyle] = React.useState({});

	const close = () => setOpen(false);

	const childrenWithClose = React.Children.map(children, child =>
		React.isValidElement(child)? React.cloneElement(child, {close}): child
	);

	React.useEffect(() => {
		if (isOpen) {
			const bounds = dropdownRef.current.getBoundingClientRect();
			if (bounds.bottom > window.innerHeight)
				setDropdownStyle(style => ({...style, maxHeight: window.innerHeight - bounds.top}))
			if (bounds.left < 0)
				setDropdownStyle(style => ({...style, position: 'fixed', top: bounds.y, left: 0, right: 'unset', maxWidth: window.innerWidth}))
		}
		else {
			setDropdownStyle({})
		}
	}, [isOpen]);

	useClickOutside(wrapperRef, close);

	return (
		<Wrapper
			className={className}
			style={style}
			ref={wrapperRef}
		>
			<ActionButton
				name={name}
				title={title}
				disabled={disabled}
				onClick={() => setOpen(!isOpen)}
			/>
			{isOpen &&
				<DropdownContainer
					ref={dropdownRef}
					style={dropdownStyle}
				>
					{childrenWithClose}
				</DropdownContainer>}
		</Wrapper>
	)
}

ActionButtonDropdown.propTypes = {
	name: PropTypes.string.isRequired,
	title: PropTypes.string,
	disabled: PropTypes.bool,
}

export {ActionButtonDropdown};
