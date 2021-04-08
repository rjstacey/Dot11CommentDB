import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {ActionButtonDropdown} from 'dot11-common/general/Dropdown'
import {Form, Col} from 'dot11-common/general/Form'

import {uploadMembers} from '../store/members'

const StyledForm = styled(Form)`
	width: 400px;
`;

function _MembersUploadDropdown({upload, close}) {
	const fileRef = React.useRef();
	const [errMsg, setErrMsg] = React.useState('')

	const submit = () => {
		const file = fileRef.current.files[0]
		if (!file) {
			setErrMsg('Select spreadsheet file')
			return
		}
		upload(file).then(close)
	}

	return (
		<StyledForm
			title='Upload MyProject roster spreadsheet'
			errorText={errMsg}
			submit={submit}
			cancel={close}
		>
			<Col>
				<label htmlFor='fileInput'>Spreadsheet:</label>
				<input
					type='file'
					id='fileInput'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={fileRef}
					onClick={e => setErrMsg('')}
				/>
			</Col>
		</StyledForm>
	)
}

_MembersUploadDropdown.propTypes = {
	upload: PropTypes.func.isRequired,
	close: PropTypes.func.isRequired,
}

const MembersUploadDropdown = connect(
	null,
	{upload: uploadMembers}
)(_MembersUploadDropdown)

const MembersUpload = () =>
	<ActionButtonDropdown
		name='upload'
		title='Upload users' 
	>
		<MembersUploadDropdown />
	</ActionButtonDropdown>

export default MembersUpload;