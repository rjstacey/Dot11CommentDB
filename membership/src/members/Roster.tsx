import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch} from 'react-redux';

import {ActionButton, ActionButtonDropdown, Form, Row, Col, RendererProps} from 'dot11-components';

import {importMyProjectRoster, exportMyProjectRoster} from '../store/members';

function RosterImportDropdown({methods}: RendererProps) {

	const dispatch = useDispatch();
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [errMsg, setErrMsg] = React.useState('');
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		const files = fileRef.current?.files;
		if (!files) {
			setErrMsg('Select spreadsheet file');
			return;
		}
		setBusy(true);
		await dispatch(importMyProjectRoster(files[0]));
		setBusy(false);
		methods.close();
	}

	return (
		<Form
			style={{width: 400}}
			title='Import roster'
			errorText={errMsg}
			submit={submit}
			cancel={methods.close}
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
	methods: PropTypes.object.isRequired,
}

const RosterImport = () =>
	<ActionButtonDropdown
		name='import'
		title='Import roster'
		dropdownRenderer={(props) => <RosterImportDropdown {...props}/>}
	/>

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