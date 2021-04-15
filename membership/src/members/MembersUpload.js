import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {ActionButtonDropdown} from 'dot11-common/general/Dropdown'
import {Form, Row, Col, Input, List, ListItem} from 'dot11-common/general/Form'

import {uploadMembers, UploadFormat} from '../store/members'

const StyledForm = styled(Form)`
	width: 400px;
`;

function _MembersUploadDropdown({upload, close}) {
	const fileRef = React.useRef();
	const [errMsg, setErrMsg] = React.useState('')
	const [format, setFormat] = React.useState(UploadFormat.Roster)

	const submit = () => {
		const file = fileRef.current.files[0]
		if (!file) {
			setErrMsg('Select spreadsheet file')
			return
		}
		upload(format, file).then(close)
	}

	const changeFormat = e => setFormat(e.target.value);

	return (
		<StyledForm
			title='Upload spreadsheet'
			errorText={errMsg}
			submit={submit}
			cancel={close}
		>
			<Row>
				<List
					label='Import:'
				>
					<ListItem>
						<input
							type='radio'
							title='Import members from MyProject roster'
							value={UploadFormat.Roster}
							checked={format === UploadFormat.Roster}
							onChange={changeFormat}
						/>
						<label>Members from MyProject roster</label>
					</ListItem>
					<ListItem>
						<input
							type='radio'
							title='Import members (replaces existing)'
							value={UploadFormat.Members}
							checked={format === UploadFormat.Members}
							onChange={changeFormat}
						/>
						<label>Members from Access database</label>
					</ListItem>
					<ListItem>
						<input
							type='radio'
							title='Import member SAPINs (replaces existing)'
							value={UploadFormat.SAPINs}
							checked={format === UploadFormat.SAPINs}
							onChange={changeFormat}
						/>
						<label>Member SAPINs from Access database</label>
					</ListItem>
					<ListItem>
						<input
							type='radio'
							title='Import member email addresses (replaces existing)'
							value={UploadFormat.Emails}
							checked={format === UploadFormat.Emails}
							onChange={changeFormat}
						/>
						<label>Member email addresses from Access database</label>
					</ListItem>
				</List>
			</Row>
			<Row>
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
			</Row>
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