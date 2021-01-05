import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Form, Row, Col, List, ListItem, Field} from '../general/Form'
import ConfirmModal from '../modals/ConfirmModal'
import {uploadResolutions, FieldsToUpdate, MatchAlgorithm, MatchUpdate} from '../actions/comments'
import {ActionButtonDropdown} from '../general/Dropdown'

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
];

const matchAlgoOptions = [
	{value: MatchAlgorithm.Elimination,
		label: 'Successive elimination',
		description: 'Successively eliminate rows that do not match until only one row is left by matching, in order, Commenter, Category, Page, ' +
		'Line, Comment and Proposed Change. Fields that might have issues are only matched if needed.'},
	{value: MatchAlgorithm.Perfect,
		label: 'Match comment',
		description: 'Match Commenter, Category, Page, Line, Comment and Proposed Change'},
	{value: MatchAlgorithm.CID,
		label: 'Match CID',
		description: 'Match CID'}
];

const matchUpdateOptions = [
	{value: MatchUpdate.All,
		label: 'All comments',
		description: 'Update all comments provided all comments match.'},
	{value: MatchUpdate.Any,
		label: 'Any comments that match',
		description: 'Update comments that match, ignore comments that don\'t match.'},
	{value: MatchUpdate.Add,
		label: 'Add comments that don\'t match any existing comments',
		description: 'Update all comments and add extra comments provided all existing comments match'}
];

const CommentsImportForm = styled(Form)`
	width: 600px;
`;

const ImportFieldsList = ({fields, setFields}) => {
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
		setFields(newFields)
	}
	return (
		<List
			label='Import fields (selected fields will be overwritten):'
		>
			{importFieldOptions.map(a => 
				<ListItem key={a.value}>
					<input type='checkbox' title={a.description} value={a.value} checked={fields.includes(a.value)} onChange={changeImportFields} />
					<label>{a.label}</label>
				</ListItem>
			)}
		</List>
	)
}

const MatchAlgoList = ({algo, setAlgo}) =>
	<List
		label='Match algorithm:'
	>
		{matchAlgoOptions.map(a => 
			<ListItem key={a.value}>
				<input type='radio'
					title={a.description}
					value={a.value}
					checked={algo === a.value}
					onChange={e => setAlgo(e.target.value)}
				/>
				<label>{a.label}</label>
			</ListItem>
		)}
	</List>

const UpdateList = ({matchUpdate, setMatchUpdate}) =>
	<List
		label='Update:'
	>
		{matchUpdateOptions.map(a => 
			<ListItem key={a.value}>
				<input
					type='radio'
					title={a.description}
					value={a.value}
					checked={matchUpdate === a.value}
					onChange={e => setMatchUpdate(e.target.value)}
				/>
				<label>{a.label}</label>
			</ListItem>
		)}
	</List>

function _CommentsImportDropdown({ballotId, close, upload}) {
	const fileRef = React.useRef()
	const [fields, setFields] = React.useState([])
	const [algo, setAlgo] = React.useState(MatchAlgorithm.CID)
	const [matchUpdate, setMatchUpdate] = React.useState(MatchUpdate.All)
	const [sheetName, setSheetName] = React.useState('Comments')
	const [errMsg, setErrMsg] = React.useState('')

	async function submit() {
		const file = fileRef.current.files[0]
		if (!file) {
			setErrMsg('Select spreadsheet file')
			return
		}
		const unmatched = await upload(ballotId, fields, algo, matchUpdate, sheetName, file)
		close()
		if (unmatched !== null) {
			const msg = unmatched.length > 1?
				`${unmatched.length} comments were not updated:\n${unmatched.join(', ')}`:
				unmatched.length === 1?
				`${unmatched.length} comment was not updated:\n${unmatched[0]}`:
				`All comments successfully update`
			await ConfirmModal.show(msg)
		}
	}

	return (
		<CommentsImportForm
			title={`Import fields for ${ballotId} from Excel spreadsheet`}
			errorText={errMsg}
			submit={submit}
			cancel={close}
		>
			<Row>
				<Col>
					<ImportFieldsList fields={fields} setFields={setFields}	/>
				</Col>
				<Col>
					<Row>
						<MatchAlgoList algo={algo} setAlgo={setAlgo} />
					</Row>
					<Row>
						<UpdateList matchUpdate={matchUpdate} setMatchUpdate={setMatchUpdate} />
					</Row>
				</Col>
			</Row>
			<Row>
				<Field
					label='Spreadsheet file:'
					style={{justifyContent: 'left'}}
				>
					<input
						type='file'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={fileRef}
						onClick={e => setErrMsg('')}
					/>
				</Field>
			</Row>
			<Row>
				<Field
					label='Worksheet name:'
					style={{justifyContent: 'left'}}
				>
					<input type='text' value={sheetName} onChange={e => setSheetName(e.target.value)} />
				</Field>
			</Row>
		</CommentsImportForm>
	)
}

_CommentsImportDropdown.propTypes = {
	close: PropTypes.func.isRequired,
	ballotId: PropTypes.string.isRequired,
	upload: PropTypes.func.isRequired
}

const CommentsImportDropdown = connect(
	null,
	(dispatch, ownProps) => {
		return {
			upload: (...args) => dispatch(uploadResolutions(...args))
		}
	}
)(_CommentsImportDropdown)

function CommentsImport({
	className,
	style,
	ballotId
}) {
	return (
		<ActionButtonDropdown
			name='upload'
			title='Upload resolutions'
			disabled={!ballotId}
		>
			<CommentsImportDropdown
				ballotId={ballotId}
			/>
		</ActionButtonDropdown>
	)
}
export default CommentsImport;