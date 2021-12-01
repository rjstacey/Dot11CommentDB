import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch} from 'react-redux';

import {ActionButtonDropdown} from 'dot11-components/general/Dropdown';
import {Form, Row, Col, Input, List, ListItem} from 'dot11-components/form';

import {uploadMembers, UploadFormat} from '../store/members';

function MembersUploadForm({close}) {

	const dispatch = useDispatch();
	const fileRef = React.useRef();
	const [errMsg, setErrMsg] = React.useState('');
	const [format, setFormat] = React.useState(UploadFormat.Roster);
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		const file = fileRef.current.files[0];
		if (!file) {
			setErrMsg('Select spreadsheet file');
			return;
		}
		setBusy(true);
		await dispatch(uploadMembers(format, file));
		setBusy(false);
		close();
	}

	const changeFormat = e => setFormat(e.target.value);

	return (
		<Form
			title='Upload spreadsheet'
			errorText={errMsg}
			submit={submit}
			cancel={close}
			busy={busy}
			style={{width: 400}}
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
					<ListItem>
						<input
							type='radio'
							title='Import member history (replaces existing)'
							value={UploadFormat.History}
							checked={format === UploadFormat.History}
							onChange={changeFormat}
						/>
						<label>Member history from Access database</label>
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
		</Form>
	)
}

MembersUploadForm.propTypes = {
	close: PropTypes.func,
}

const MembersUpload = () =>
	<ActionButtonDropdown
		name='upload'
		title='Upload members' 
	>
		<MembersUploadForm />
	</ActionButtonDropdown>

export default MembersUpload;
