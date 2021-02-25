import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppModal from '../modals/AppModal'
import {Form, Row} from '../general/Form'

import {uploadVoters} from '../store/voters'

const VotersImportForm = styled(Form)`
	width: 400px;
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
			<VotersImportForm
				title={`Import voters list for ${votingPoolName}`}
				errorText={errMsg}
				submit={submit}
				cancel={close}
			>
				<Row>
					<input
						type='file'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={fileInputRef}
					/>
				</Row>
			</VotersImportForm>
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
