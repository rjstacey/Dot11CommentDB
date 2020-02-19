import React from 'react'
import {connect} from 'react-redux'
import AppModal from './AppModal'
import {clearError} from './actions/error'

function ErrorModal(props) {
	return (
		<AppModal
			isOpen={props.errMsg !== null}
			onRequestClose={() => props.dispatch(clearError())}
		>
			<p>{props.errMsg}</p>
			<button onClick={() => props.dispatch(clearError())}>OK</button>
		</AppModal>
	)
}

function mapStateToProps(state) {
	const {errMsg} = state
	return {
		errMsg: errMsg.length? errMsg[0]: null
	}
}
export default connect(mapStateToProps)(ErrorModal);