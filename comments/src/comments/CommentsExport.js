import PropTypes from 'prop-types'
import React from 'react'
import {useDispatch} from 'react-redux'
import styled from '@emotion/styled'
import {Form, Row, List, ListItem} from 'dot11-components/form'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'

import {exportCommentsSpreadsheet, CommentsSpreadsheetFormat, CommentsSpreadsheetStyle} from '../store/comments'

const CommentsExportForm = styled(Form)`
	width: 450px;
`;

function CommentsExportDropdown({
	close,
	ballot,
}) {
	const dispatch = useDispatch();
	const fileRef = React.useRef();
	const [errMsg, setErrMsg] = React.useState('');
	const [spreadsheetFormat, setSpreadsheetFormat] = React.useState(CommentsSpreadsheetFormat.Modern);
	const [spreadsheetStyle, setSpreadsheetStyle] = React.useState(CommentsSpreadsheetStyle.AllComments);
	const [busy, setBusy] = React.useState(false);

	async function submit(e) {
		const file = fileRef.current.files[0];
		if (spreadsheetFormat === CommentsSpreadsheetFormat.MyProject && !file) {
			setErrMsg('Select MyProject comment spreadsheet file');
			return;
		}
		setBusy(true);
		await dispatch(exportCommentsSpreadsheet(ballot.id, file, spreadsheetFormat, spreadsheetStyle));
		setBusy(false);
		close();
	}

	return (
		<CommentsExportForm
			title={`Export comments for ${ballot.BallotID} to Excel spreadsheet`}
			errorText={errMsg}
			submit={submit}
			cancel={close}
			busy={busy}
		>
			<Row>
				<List
					label='Spreadsheet format:'
				>
					<ListItem>
						<input
							type="radio"
							id={CommentsSpreadsheetFormat.Modern}
							title={'Modern format'}
							checked={spreadsheetFormat === CommentsSpreadsheetFormat.Modern}
							onChange={e => setSpreadsheetFormat(CommentsSpreadsheetFormat.Modern)}
						/>
						<label htmlFor={CommentsSpreadsheetFormat.Modern}>
							Modern spreadsheet
						</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id={CommentsSpreadsheetFormat.Legacy}
							title={'Legacy format; compatible APS Comments Access Database.'}
							checked={spreadsheetFormat === CommentsSpreadsheetFormat.Legacy}
							onChange={e => setSpreadsheetFormat(CommentsSpreadsheetFormat.Legacy)}
						/>
						<label htmlFor={CommentsSpreadsheetFormat.Legacy}>
							Legacy spreadsheet
						</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id={CommentsSpreadsheetFormat.MyProject}
							title={'Export appoved resolutions for MyProject upload. Modifies an existing MyProject comment spreadsheet.'}
							checked={spreadsheetFormat === CommentsSpreadsheetFormat.MyProject}
							onChange={e => setSpreadsheetFormat(CommentsSpreadsheetFormat.MyProject)}
						/>
						<label htmlFor={CommentsSpreadsheetFormat.MyProject}>
							All resolved comments for MyProject upload
						</label>
					</ListItem>
				</List>
			</Row>
			<Row>
				<List
					label='Spreadsheet style:'
				>
					<ListItem>
						<input
							type="radio"
							id={CommentsSpreadsheetStyle.AllComments}
							title={'Export all comments. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.'}
							checked={spreadsheetStyle === CommentsSpreadsheetStyle.AllComments}
							onChange={e => setSpreadsheetStyle(CommentsSpreadsheetStyle.AllComments)}
						/>
						<label htmlFor={CommentsSpreadsheetStyle.AllComments}>
							All comments
						</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id={CommentsSpreadsheetStyle.TabPerAdHoc}
							title={'Export all comments plus a tab for each ad-hoc. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.'}
							checked={spreadsheetStyle === CommentsSpreadsheetStyle.TabPerAdHoc}
							onChange={e => setSpreadsheetStyle(CommentsSpreadsheetStyle.TabPerAdHoc)}
						/>
						<label htmlFor={CommentsSpreadsheetStyle.TabPerAdHoc}>
							All comments plus one sheet per ad-hoc
						</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							id={CommentsSpreadsheetStyle.TabPerCommentGroup}
							title={'Export all comments plus a tab for each comment group. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.'}
							checked={spreadsheetStyle === CommentsSpreadsheetStyle.TabPerCommentGroup}
							onChange={e => setSpreadsheetStyle(CommentsSpreadsheetStyle.TabPerCommentGroup)}
						/>
						<label htmlFor={CommentsSpreadsheetStyle.TabPerCommentGroup}>
							All comments plus one sheet per comment group
						</label>
					</ListItem>
				</List>
			</Row>
			<Row>
				<input
					type='file'
					id='fileInput'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={fileRef}
					onClick={e => setErrMsg('')}
				/>
			</Row>
		</CommentsExportForm>
	)
}

CommentsExportDropdown.propTypes = {
	ballot: PropTypes.object,
	//close: PropTypes.func.isRequired, Can't check for close; only available at render
}

function CommentsExport({
	ballot
}) {
	return (
		<ActionButtonDropdown
			name='export'
			title='Export to file'
			disabled={!ballot}
		>
			<CommentsExportDropdown
				ballot={ballot}
			/>
		</ActionButtonDropdown>
	)
}

export default CommentsExport;