import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch} from 'react-redux';

import {ActionButton} from 'dot11-components/icons';
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown';
import {Form, Row, Col, Input, List, ListItem} from 'dot11-components/form';

import {importMyProjectRoster, exportMyProjectRoster} from '../store/members';

function RosterImportDropdown({close}) {

	const dispatch = useDispatch();
	const fileRef = React.useRef();
	const [errMsg, setErrMsg] = React.useState('');
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		const file = fileRef.current.files[0];
		if (!file) {
			setErrMsg('Select spreadsheet file');
			return;
		}
		setBusy(true);
		await dispatch(importMyProjectRoster(file));
		setBusy(false);
		close();
	}

	return (
		<Form
			style={{width: 400}}
			title='Import roster'
			errorText={errMsg}
			submit={submit}
			cancel={close}
			busy={busy}
		>
			<Row>
				Importing the roster will update the name, email, employer and affiliation
				of exiting members (without changing their status) and insert all others as
				Non-Voters.
			</Row>
			<Row>
				<Col>
					<label htmlFor='fileInput'>MyProject roster spreadsheet:</label>
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

RosterImportDropdown.propTypes = {
	close: PropTypes.func,
}

const RosterImport = () =>
	<ActionButtonDropdown
		name='import'
		title='Import roster' 
	>
		<RosterImportDropdown />
	</ActionButtonDropdown>

function RosterExport() {
	const dispatch = useDispatch();

	return (
		<ActionButton
			name='export'
			title='Export roster'
			onClick={() => dispatch(exportMyProjectRoster())}
		/>
	)
}

export {RosterImport, RosterExport};