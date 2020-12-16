import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppModal from '../modals/AppModal'
import {uploadVoters} from '../actions/voters'

const Form = styled.div`
	width: 400px;
	& button {
		width: 100px;
		padding: 8px 16px;
		border: none;
		background: #333;
		color: #f2f2f2;
		text-transform: uppercase;
		border-radius: 2px;
	}
	& .titleRow {
		justify-content: center;
	}
	& .errMsgRow {
		justify-content: center;
		color: red
	}
	& .buttonRow {
		margin-top: 30px;
		justify-content: space-around;
	}
`;

const FormRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	margin: 10px;
`;


function VotersImportModal({
	isOpen,
	close,
	votingPoolName,
	votingPoolType,
	uploadVoters
	}) {

	const fileInputRef = React.useRef();
	const [errMsg, setErrMsg] = React.useState('')

	async function submit() {
		const file = fileInputRef.current.files[0]
		if (!file) {
			setErrMsg('Select file');
			return
		}
		await uploadVoters(votingPoolType, votingPoolName, file)
		close()
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<Form>
				<FormRow className='titleRow'>
					<h3>Import voters list for {votingPoolName}</h3>
				</FormRow>
				<FormRow>
					<input
						type='file'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={fileInputRef}
					/>
				</FormRow>
				<FormRow className='errMsgRow'>
					<span>{errMsg}</span>
				</FormRow>
				<FormRow className='buttonRow'>
					<button onClick={submit}>OK</button>
					<button onClick={close}>Cancel</button>
				</FormRow>
			</Form>
		</AppModal>
	)
}

VotersImportModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	votingPoolName: PropTypes.string.isRequired,
	votingPoolType: PropTypes.oneOf(['SA', 'WG']),
	uploadVoters: PropTypes.func.isRequired
}

export default connect(
	null,
	(dispatch, ownProps) => ({
		uploadVoters: (...args) => dispatch(uploadVoters(...args)),
	})
)(VotersImportModal);
