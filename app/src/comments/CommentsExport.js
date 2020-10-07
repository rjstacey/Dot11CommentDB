import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppModal from '../modals/AppModal'
import {exportCommentsSpreadsheet, CommentsSpreadsheetFormat} from '../actions/comments'

const Form = styled.div`
	width: 400px;
	padding: 0;
	overflow: visible;
	& button {
		width: 100px;
		padding: 8px 16px;
		border: none;
		background: #333;
		color: #f2f2f2;
		text-transform: uppercase;
		border-radius: 2px;
	}
	& .titleRow {
		justify-content: center;
	}
	& .errMsgRow {
		justify-content: center;
		color: red
	}
	& .buttonRow {
		margin-top: 30px;
		justify-content: space-around;
	}`

const FormRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	margin: 10px;
	justify-content: flex-start;`

function CommentsExportModal({isOpen, close, ballotId, exportSpreadsheet}) {
	const fileRef = React.useRef()
	const [errMsg, setErrMsg] = React.useState('')
	const [spreadsheetFormat, setSpreadsheetFormat] = React.useState(CommentsSpreadsheetFormat.MyProject)

	async function submit(e) {
		const file = fileRef.current.files[0]
		if (spreadsheetFormat === CommentsSpreadsheetFormat.MyProject && !file) {
			setErrMsg('Select MyProject comment spreadsheet')
			return
		}
		await exportSpreadsheet(ballotId, file, spreadsheetFormat)
		close()
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<Form>
				<FormRow className='titleRow'>
					<h3>Export comments for {ballotId}:</h3>
				</FormRow>
				<FormRow>
					<label>For MyProject upload. Modifies an existing MyProject comment spreadsheet.</label>
				</FormRow>
				<FormRow>
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
				</FormRow>
				<FormRow>
					<label>For review or mentor upload. Optionally overwrites an existing spreadsheet keeping Title and Revision History tabs.</label>
				</FormRow>
				<FormRow>
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
				</FormRow>
				<FormRow>
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
				</FormRow>
				<FormRow>
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
				</FormRow>
				<FormRow>
					<input
						type='file'
						id='fileInput'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={fileRef}
						onClick={e => setErrMsg('')}
					/>
				</FormRow>
				<FormRow className='errMsgRow'>
					<span>{errMsg || '\u00A0'}</span>
				</FormRow>
				<FormRow className='buttonRow'>
					<button onClick={submit}>OK</button>
					<button onClick={close}>Cancel</button>
				</FormRow>
			</Form>
		</AppModal>
	)
}

CommentsExportModal.propTypes = {
	ballotId: PropTypes.string.isRequired,
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
}

export default connect(
	null,
	(dispatch, ownProps) => {
		return {
			exportSpreadsheet: (...args) => dispatch(exportCommentsSpreadsheet(...args)),
		}
	} 
)(CommentsExportModal)
