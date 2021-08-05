import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {ActionButton} from 'dot11-components/icons'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'
import {Form, Row, Col, Input, List, ListItem} from 'dot11-components/general/Form'

import {importMyProjectRoster, exportMyProjectRoster} from '../store/members'

const StyledForm = styled(Form)`
	width: 400px;
`;

function _RosterImportDropdown({importRoster, close}) {
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
		await importRoster(file);
		setBusy(false);
		close();
	}

	return (
		<StyledForm
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
		</StyledForm>
	)
}

_RosterImportDropdown.propTypes = {
	importRoster: PropTypes.func.isRequired,
	close: PropTypes.func.isRequired,
}

const RosterImportDropdown = connect(
	null,
	{importRoster: importMyProjectRoster}
)(_RosterImportDropdown);

const RosterImport = () =>
	<ActionButtonDropdown
		name='import'
		title='Import roster' 
	>
		<RosterImportDropdown />
	</ActionButtonDropdown>

const _RosterExport = ({exportRoster}) =>
	<ActionButton
		name='export'
		title='Export roster'
		onClick={exportRoster}
	/>

const RosterExport = connect(
	null,
	{exportRoster: exportMyProjectRoster}
)(_RosterExport);

export {RosterImport, RosterExport};