import React from 'react'
import PropTypes from 'prop-types'
import Modal from 'react-modal'

const modalStyle = {
	content: {
		position: 'absolute',
		top: '20%',
		left: '50%',
		right: 'unset',
		bottom: 'unset',
		width: 'fit-content',
		maxWidth: '90%',
		maxHeight: '80%',
		overflow: 'auto',
		transform: 'translate(-50%, 0)',
		padding: '20px',
		background: '#fff',
		border: '1px solid #ccc',
		borderRadius: 5,
		boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.2)',
		boxSizing: 'border-box'
	},
	overlay: {
		position: 'fixed',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0)' /* Black w/ opacity */
	}
}

function AppModal({isOpen, onRequestClose, children, ...otherProps}) {
	return (
		<Modal
			isOpen={isOpen}
			style={modalStyle}
			appElement={document.querySelector('#root')}
			onRequestClose={onRequestClose}
			{...otherProps}
		>
			{children}
		</Modal>
	)
}

AppModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onRequestClose: PropTypes.func,
}

export default AppModal;
