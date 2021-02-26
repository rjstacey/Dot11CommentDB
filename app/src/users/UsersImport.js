import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {ActionButtonDropdown} from '../general/Dropdown'
import {Form, Col} from '../general/Form'

import {uploadUsers} from '../store/users'

const UsersImportForm = styled(Form)`
	width: 400px;
`;

function _UsersImportDropdown({upload, close}) {
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
		<UsersImportForm
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
		</UsersImportForm>
	)
}

_UsersImportDropdown.propTypes = {
	upload: PropTypes.func.isRequired,
	close: PropTypes.func.isRequired,
}

const UsersImportDropdown = connect(
	null,
	{upload: uploadUsers}
)(_UsersImportDropdown)

function UsersImport() {
	return (
		<ActionButtonDropdown
			name='upload'
			title='Upload users' 
		>
			<UsersImportDropdown />
		</ActionButtonDropdown>
	)
}

export default UsersImport;