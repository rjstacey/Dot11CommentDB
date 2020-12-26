import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Form, Row} from '../general/Form'
import {ActionButtonDropdown} from '../general/Dropdown'
import {exportCommentsSpreadsheet, CommentsSpreadsheetFormat} from '../actions/comments'

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
	const [spreadsheetFormat, setSpreadsheetFormat] = React.useState(CommentsSpreadsheetFormat.MyProject)

	async function submit(e) {
		const file = fileRef.current.files[0]
		if (spreadsheetFormat === CommentsSpreadsheetFormat.MyProject && !file) {
			setErrMsg('Select MyProject comment spreadsheet file')
			return
		}
		await exportSpreadsheet(ballotId, file, spreadsheetFormat)
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
				<label>For MyProject upload. Modifies an existing MyProject comment spreadsheet.</label>
			</Row>
			<Row>
				<input
					type="radio"
					id={CommentsSpreadsheetFormat.MyProject}
					title={'Export appoved resolutions for MyProject upload. Modifies an existing MyProject comment spreadsheet.'}
					checked={spreadsheetFormat === CommentsSpreadsheetFormat.MyProject}
					onChange={e => setSpreadsheetFormat(CommentsSpreadsheetFormat.MyProject)}
				/>
				<label htmlFor={CommentsSpreadsheetFormat.MyProject}>
					All resolved comments
				</label>
			</Row>
			<Row>
				<label>For review or mentor upload. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.</label>
			</Row>
			<Row>
				<input
					type="radio"
					id={CommentsSpreadsheetFormat.AllComments}
					title={'Export all comments. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.'}
					checked={spreadsheetFormat === CommentsSpreadsheetFormat.AllComments}
					onChange={e => setSpreadsheetFormat(CommentsSpreadsheetFormat.AllComments)}
				/>
				<label htmlFor={CommentsSpreadsheetFormat.AllComments}>
					All comments
				</label>
			</Row>
			<Row>
				<input
					type="radio"
					id={CommentsSpreadsheetFormat.TabPerAdHoc}
					title={'Export all comments plus a tab for each ad-hoc. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.'}
					checked={spreadsheetFormat === CommentsSpreadsheetFormat.TabPerAdHoc}
					onChange={e => setSpreadsheetFormat(CommentsSpreadsheetFormat.TabPerAdHoc)}
				/>
				<label htmlFor={CommentsSpreadsheetFormat.TabPerAdHoc}>
					All comments plus one sheet per ad-hoc
				</label>
			</Row>
			<Row>
				<input
					type="radio"
					id={CommentsSpreadsheetFormat.TabPerCommentGroup}
					title={'Export all comments plus a tab for each comment group. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.'}
					checked={spreadsheetFormat === CommentsSpreadsheetFormat.TabPerCommentGroup}
					onChange={e => setSpreadsheetFormat(CommentsSpreadsheetFormat.TabPerCommentGroup)}
				/>
				<label htmlFor={CommentsSpreadsheetFormat.TabPerCommentGroup}>
					All comments plus one sheet per comment group
				</label>
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
	(dispatch, ownProps) => {
		return {
			exportSpreadsheet: (...args) => dispatch(exportCommentsSpreadsheet(...args)),
		}
	} 
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