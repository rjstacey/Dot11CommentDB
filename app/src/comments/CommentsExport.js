import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Form, Row, List, ListItem} from 'dot11-common/general/Form'
import {ActionButtonDropdown} from 'dot11-common/general/Dropdown'

import {exportCommentsSpreadsheet, CommentsSpreadsheetFormat, CommentsSpreadsheetStyle} from '../store/comments'

const CommentsExportForm = styled(Form)`
	width: 450px;
`;

function _CommentsExportDropdown({
	close,
	ballotId,
	exportSpreadsheet
}) {
	const fileRef = React.useRef()
	const [errMsg, setErrMsg] = React.useState('')
	const [spreadsheetFormat, setSpreadsheetFormat] = React.useState(CommentsSpreadsheetFormat.Modern)
	const [spreadsheetStyle, setSpreadsheetStyle] = React.useState(CommentsSpreadsheetStyle.AllComments)

	async function submit(e) {
		const file = fileRef.current.files[0]
		if (spreadsheetFormat === CommentsSpreadsheetFormat.MyProject && !file) {
			setErrMsg('Select MyProject comment spreadsheet file')
			return
		}
		await exportSpreadsheet(ballotId, file, spreadsheetFormat, spreadsheetStyle)
		close()
	}

	return (
		<CommentsExportForm
			title={`Export comments for ${ballotId} to Excel spreadsheet`}
			errorText={errMsg}
			submit={submit}
			cancel={close}
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

_CommentsExportDropdown.propTypes = {
	ballotId: PropTypes.string.isRequired,
	close: PropTypes.func.isRequired,
	exportSpreadsheet: PropTypes.func.isRequired
}

const CommentsExportDropdown = connect(
	null,
	{exportSpreadsheet: exportCommentsSpreadsheet}
)(_CommentsExportDropdown)

function CommentsExport({
	ballotId
}) {
	return (
		<ActionButtonDropdown
			name='export'
			title='Export to file'
			disabled={!ballotId}
		>
			<CommentsExportDropdown
				ballotId={ballotId}
			/>
		</ActionButtonDropdown>
	)
}
export default CommentsExport;