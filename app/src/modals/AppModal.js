import PropTypes from 'prop-types'
import Modal from 'react-modal'
import {IconClose} from '../general/Icons'

/** @jsx jsx */
import { css, jsx, ClassNames } from '@emotion/core'

const modalCss = css`
	position: absolute;
	top: 20%;
	left: 50%;
	max-width: 90vw;
	max-height: 90vw;
	overflow: auto;
	transform: translate(-50%, 0);
	background-color: #fefefe;
	padding: 20px;
	border: 1px solid #888;`

const overlayCss = css`
	position: fixed; /* Stay in place */
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	width: 100%; /* Full width */
	height: 100%; /* Full height */
	background-color: rgb(0,0,0); /* Fallback color */
	background-color: rgba(0,0,0,0.4); /* Black w/ opacity */`

const closeCss = css`
	position: absolute;
	top: 5px;
	right: 5px;`

function AppModal({isOpen, onRequestClose, children, ...otherProps}) {
	return (
		<ClassNames>
			{({css, cx}) => (
				<Modal
					isOpen={isOpen}
					css={modalCss}
					overlayClassName={css(overlayCss)}
					appElement={document.querySelector('main')}
					{...otherProps}
				>
					<IconClose css={closeCss} onClick={onRequestClose} />
					{children}
				</Modal>
			)}
		</ClassNames>
	)
}

AppModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onRequestClose: PropTypes.func,
}

export default AppModal;
