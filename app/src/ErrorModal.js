import React from 'react'
import {connect} from 'react-redux'
import AppModal from './AppModal'
import {clearError} from './actions/error'

function strToHtml(s) {
	return s
		.split('<')
		.join('&lt;')
		.split('>')
		.join('&gt;')
		.split('\n')
		.join('<br />')
}

function ErrorModal(props) {
	const {errMsg, dispatch} = props
	return (
		<AppModal
			isOpen={errMsg !== null}
			onRequestClose={() => dispatch(clearError())}
		>
			{errMsg && errMsg.summary && <h3 dangerouslySetInnerHTML={{__html: strToHtml(errMsg.summary)}} />}
			{errMsg && errMsg.detail && <p dangerouslySetInnerHTML={{__html: strToHtml(errMsg.detail)}} />}
			<button onClick={() => dispatch(clearError())}>OK</button>
		</AppModal>
	)
}

function mapStateToProps(state) {
	const {errMsg} = state
	return {
		errMsg: errMsg.length? errMsg[0]: null
	}
}
export default connect(mapStateToProps)(ErrorModal)