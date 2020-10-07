import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppModal from '../modals/AppModal'
import ConfirmModal from '../modals/ConfirmModal'
import {uploadResolutions, FieldsToUpdate, MatchAlgorithm} from '../actions/comments'

const importFieldOptions = [
	{value: FieldsToUpdate.CID,
		label: 'CID',
		description: 'Update CID of each comment'},
	{value: FieldsToUpdate.Comment,
		label: 'Comment',
		description: 'Update Clause, Page and Line fields of each comment. Original fields as commented are preserved.'},
	{value: FieldsToUpdate.AdHoc,
		label: 'Owning Ad-hoc',
		description: 'Update Owning Ad-hoc field of each comment'},
	{value: FieldsToUpdate.CommentGroup,
		label: 'Comment Group',
		description: 'Update Comment Group field of each comment'},
	{value: FieldsToUpdate.Assignee,
		label: 'Assignee',
		description: 'Update Assignee field of each comment'},
	{value: FieldsToUpdate.Resolution,
		label: 'Resolutions',
		description: 'Update Submission, Resn Status, Resolution and Motion Number fields of each comment'},
	{value: FieldsToUpdate.Editing,
		label: 'Editing status',
		description: 'Update Edit Status, Edit Notes and Edited in Draft fields for each comment'}
]

const matchAlgoOptions = [
	{value: MatchAlgorithm.Ellimination,
		label: 'Successive elimination',
		description: 'Successively eliminate rows that do not match until only one row is left by matching, in order, Commenter, Category, Page, ' +
		'Line, Comment and Proposed Change. Fields that might have issues are only matched if needed.'},
	{value: MatchAlgorithm.Perfect,
		label: 'Match comment',
		description: 'Match Commenter, Category, Page, Line, Comment and Proposed Change'},
	{value: MatchAlgorithm.CID,
		label: 'Match CID',
		description: 'Match CID'}
]

const Form = styled.div`
	width: 600px;
	overflow: visible;
	& input[type=radio],
	& input[type=checkbox] {
		margin-right: 10px;
	}
	& input[id=sheetName] {
		width: 200px;
	}
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
	margin: 10px;`

const FormCol = styled.div`
	display: flex;
	flex-direction: column;
	margin: 10px;`

const Label = styled.label`
	font-weight: bold;`

function CommentsImportModal({ballotId, isOpen, close, upload}) {
	const fileRef = React.useRef()
	const [fields, setFields] = React.useState([])
	const [algo, setAlgo] = React.useState(MatchAlgorithm.CID)
	const [matchAll, setMatchAll] = React.useState(true)
	const [sheetName, setSheetName] = React.useState('Comments')
	const [errMsg, setErrMsg] = React.useState('')

	const changeImportFields = e => {
		const newFields = fields.slice()
		if (e.target.checked) {
			newFields.push(e.target.value)
		}
		else {
			const i = newFields.indexOf(e.target.value)
			if (i >= 0)
				newFields.splice(i, 1)
		}
		console.log(newFields)
		setFields(newFields)
	}

	async function submit() {
		const file = fileRef.current.files[0]
		if (!file) {
			setErrMsg('Select spreadsheet file')
			return
		}
		const unmatched = await upload(ballotId, fields, algo, matchAll, sheetName, file)
		close()
		if (unmatched !== null) {
			const msg = unmatched.length?
				`${unmatched.length} comments were not updated:\n${unmatched.join(', ')}`:
				`All comments successfully update`
			await ConfirmModal.show(msg)
		}
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<Form>
				<FormRow className='titleRow'>
					<h3>Import fields for {ballotId} from an Excel spreadsheet</h3>
				</FormRow>
				<FormCol>
					<span><Label>Import fields:</Label> (existing content will be overwritten)</span>
					<div>
						{importFieldOptions.map(a => 
							<React.Fragment key={a.value}>
								<input type='checkbox' title={a.description} value={a.value} checked={fields.includes(a.value)} onChange={changeImportFields} />
								<label>{a.label}</label><br />
							</React.Fragment>
						)}
					</div>
				</FormCol>
				<FormCol>
					<Label>Match algorithm:</Label>
					<div>
						{matchAlgoOptions.map(a => 
							<React.Fragment key={a.value}>
								<input type='radio' title={a.description} value={a.value} checked={algo === a.value} onChange={e => setAlgo(e.target.value)} />
								<label>{a.label}</label><br />
							</React.Fragment>
						)}
					</div>
				</FormCol>
				<FormCol>
					<Label>Update:</Label>
					<div>
						<input type='radio' id='matchAll' checked={matchAll} onChange={e => setMatchAll(!matchAll)} />
						<label htmlFor='matchAll'>All comments and only if all comments match</label><br />
						<input type='radio' id='matchAny' checked={!matchAll} onChange={e => setMatchAll(!matchAll)} />
						<label htmlFor='matchAny'>Comments that match</label>
					</div>
				</FormCol>
				<FormCol>
					<Label htmlFor='fileInput'>Spreadsheet:</Label>
					<input
						type='file'
						id='fileInput'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={fileRef}
						onClick={e => setErrMsg('')}
					/>
				</FormCol>
				<FormCol>
					<Label htmlFor='sheetName'>Worksheet name:</Label>
					<input type='text' id='sheetName' value={sheetName} onChange={e => setSheetName(e.target.value)} />
				</FormCol>
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

CommentsImportModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	ballotId: PropTypes.string.isRequired,
	upload: PropTypes.func.isRequired
}

export default connect(
	null,
	(dispatch, ownProps) => {
		return {
			upload: (...args) => dispatch(uploadResolutions(...args))
		}
	} 
)(CommentsImportModal)
