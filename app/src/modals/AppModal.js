import React from 'react'
import PropTypes from 'prop-types'
import Modal from 'react-modal'
import styled from '@emotion/styled'
import {IconClose} from '../general/Icons'

const modalStyle = {
	content: {
		position: 'absolute',
		top: '20%',
		left: '50%',
		right: 'unset',
		bottom: 'unset',
		maxWidth: '90vw',
		maxHeight: '90vw',
		overflow: 'visible',
		transform: 'translate(-50%, 0)',
		backgroundColor: '#fefefe',
		padding: '20px',
		border: '1px solid #888'
	},
	overlay: {
		position: 'fixed',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		width: '100%', /* Full width */
		height: '100%', /* Full height */
		backgroundColor: 'rgba(0,0,0,0.4)' /* Black w/ opacity */
	}
}

const PositionedCloseIcon = styled(IconClose)`
	position: absolute;
	top: 5px;
	right: 5px;`

function AppModal({isOpen, onRequestClose, children, ...otherProps}) {
	return (
		<Modal
			isOpen={isOpen}
			style={modalStyle}
			appElement={document.querySelector('main')}
			onRequestClose={onRequestClose}
			{...otherProps}
		>
			<PositionedCloseIcon onClick={onRequestClose} />
			{children}
		</Modal>
	)
}

AppModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onRequestClose: PropTypes.func,
}

export default AppModal;
