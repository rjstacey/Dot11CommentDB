import PropTypes from 'prop-types'
import React from 'react'
import Modal from 'react-modal'
import {IconClose} from './Icons'
import cx from 'classnames'
import styles from './css/Modals.css'

function AppModal(props) {
	const {className, children, ...otherProps} = props;
	return (
		<Modal
			className={cx(className, styles.modalContent)}
			overlayClassName={styles.modalOverlay}
			appElement={document.querySelector('main')}
			{...otherProps}
		>
			<IconClose className={styles.close} onClick={props.onRequestClose} />
			{children}
		</Modal>
	)
}

AppModal.propTypes = {
	className: PropTypes.string,
	isOpen: PropTypes.bool.isRequired,
	onRequestClose: PropTypes.func,
}

export default AppModal;
