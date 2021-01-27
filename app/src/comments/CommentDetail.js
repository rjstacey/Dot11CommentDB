import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs'

import AdHocSelector from './AdHocSelector'
import CommentGroupSelector from './CommentGroupSelector'
import AssigneeSelector from './AssigneeSelector'
import SubmissionSelector from './SubmissionSelector'
import {ResolutionEditor} from './ResolutionEditor'
import {ActionButton, VoteYesIcon, VoteNoIcon} from '../general/Icons'
import {Row, Col, List, ListItem, Field, FieldLeft, Checkbox, Input} from '../general/Form'
import {shallowDiff} from '../lib/utils'
import {debounce} from '../lib/utils'

import {addResolutions, updateResolutions, deleteResolutions, updateComments} from '../store/actions/comments'
import {uiSetProperty} from '../store/actions/ui'
import {getDataMap} from '../store/selectors/dataMap'

const MULTIPLE = '<multiple>';
const isMultiple = (value) => value === MULTIPLE;
const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

const MultipleContainer = styled.span`
	color: GrayText;
	font-style: italic;
`;

const Multiple = (props) => <MultipleContainer {...props}>{MULTIPLE_STR}</MultipleContainer>

const renderCommenter = (comment) => {
	const commenter = comment.CommenterName
	if (isMultiple(commenter)) {
		return <Multiple />
	}
	let vote, mbs
	if (comment.Vote === 'Approve') {
		vote = <VoteYesIcon />
	}
	else if (comment.Vote === 'Disapprove') {
		vote = <VoteNoIcon />
		if (comment.MustSatisfy)
			mbs = <span style={{color: 'red', fontSize: 'smaller', fontWeight: 'bold'}}>MBS</span>
	}
	return (
		<span>
			{commenter}
			{vote && <React.Fragment>&nbsp;{vote}</React.Fragment>}
			{mbs && <React.Fragment>&nbsp;{mbs}</React.Fragment>}
		</span>
	)
};

const renderEntry = (value) => {
	if (isMultiple(value))
		return <Multiple />
	return <span>{value}</span>
};

const renderPage = (page) => {
	if (isMultiple(page))
		return <Multiple />
	return typeof page === 'number'? page.toFixed(2): page;
}

const TextBlockContainer = styled.div`
	& p {
		margin: 8px 0;
	}
	& p:first-of-type {
		margin: 0;
	}
`;

const renderTextBlock = (value) => {
	if (!value)
		return ''
	if (isMultiple(value))
		return <Multiple />
	return (
		<TextBlockContainer>
			{value.split('\n').map((line, i) => <p key={i}>{line}</p>)}
		</TextBlockContainer>
	)
}

const Categorization = ({resolution, setResolution, readOnly}) =>
	<Row>
		<Col>
			<Field label='Ad-hoc:'>
				<AdHocSelector
					style={{flexBasis: 150}}
					value={isMultiple(resolution.AdHoc)? '': resolution.AdHoc || ''}
					onChange={value => setResolution({AdHoc: value})}
					placeholder={isMultiple(resolution.AdHoc)? MULTIPLE_STR: BLANK_STR}
					readOnly={readOnly}
				/>
			</Field>
		</Col>
		<Col>
			<Field label='Comment group:'>
				<CommentGroupSelector
					style={{flexBasis: 300}}
					value={isMultiple(resolution.CommentGroup)? '': resolution.CommentGroup || ''}
					onChange={value => setResolution({CommentGroup: value})}
					placeholder={isMultiple(resolution.CommentGroup)? MULTIPLE_STR: BLANK_STR}
					readOnly={readOnly}
				/>
			</Field>
		</Col>
	</Row>

const Column1 = ({
	style,
	className,
	resolution,
	setResolution,
	readOnly
}) => 
	<Col
		style={style}
		className={className}
	>
		<Row>
			<Field label='Assignee:'>
				<AssigneeSelector
					style={{flexBasis: 200}}
					value={isMultiple(resolution.AssigneeSAPIN || resolution.AssigneeName)?
						{SAPIN: null, Name: null}:
						{SAPIN: resolution.AssigneeSAPIN, Name: resolution.AssigneeName}}
					onChange={({SAPIN, Name}) => setResolution({AssigneeSAPIN: SAPIN, AssigneeName: Name})}
					placeholder={isMultiple(resolution.AssigneeSAPIN || resolution.AssigneeName)? MULTIPLE_STR: BLANK_STR}
					readOnly={readOnly}
				/>
			</Field>
		</Row>
		<Row>
			<Field label='Submission:'>
				<SubmissionSelector
					style={{flexBasis: 200}}
					value={isMultiple(resolution.Submission)? '': resolution.Submission || ''}
					onChange={value => setResolution({Submission: value})}
					placeholder={isMultiple(resolution.Submission)? MULTIPLE_STR: BLANK_STR}
					readOnly={readOnly}
				/>
			</Field>
		</Row>
	</Col>

function Column2({
	style,
	className,
	resolution,
	setResolution,
	readOnly
}) {

	const changeApproved = (e) => {
 		let value;
 		if (e.target.name === 'Approved') {
	 		if (e.target.checked) {
				value = new Date()
				value = value.toDateString()
			}
			else {
				value = '';
			}
		}
		else {
			value = e.target.value
		}
		setResolution({ApprovedByMotion: value})
	}

	return (
		<Col
			style={style}
			className={className}
		>
			<List>
				<ListItem>
					<Checkbox
						name='ReadyForMotion'
						indeterminate={isMultiple(resolution.ReadyForMotion)}
						checked={!!resolution.ReadyForMotion}
						onChange={e => setResolution({ReadyForMotion: e.target.checked})}
						disabled={readOnly}
					/>
					<label>Ready for motion</label>
				</ListItem>
				<ListItem>
					<Checkbox
						name='Approved'
						indeterminate={isMultiple(resolution.ApprovedByMotion)}
						checked={!!resolution.ApprovedByMotion}
						onChange={changeApproved}
						disabled={readOnly}
					/>
					<label>Approved by motion: </label>
					<Input
						type='search'
						size={6}
						name='ApprovedByMotion'
						value={isMultiple(resolution.ApprovedByMotion)? '': resolution.ApprovedByMotion || ''}
						onChange={changeApproved}
						placeholder={isMultiple(resolution.ApprovedByMotion)? MULTIPLE_STR: ''}
						disabled={readOnly}
					/>
				</ListItem>
			</List>
		</Col>
	)
}

const ResnStatusContainer = styled.div`
	display: flex;
	& div {
		display: flex;
		align-items: center;
		margin: 5px 10px;
	}
`;

function ResnStatus({
	style,
	className,
	value,
	onChange,
	readOnly
}) {
	const handleChange = e => onChange(e.target.checked? e.target.value: '');

	return (
		<ResnStatusContainer
			style={style}
			className={className}
		>
			<div>
				<Checkbox
					name='ResnStatus'
					value='A'
					checked={value === 'A'}
					indeterminate={isMultiple(value)}
					onChange={handleChange}
					disabled={readOnly}
				/>
				<label>ACCEPTED</label>
			</div>
			<div>
				<Checkbox
					name='ResnStatus'
					value='V'
					checked={value === 'V'}
					indeterminate={isMultiple(value)}
					onChange={handleChange}
					disabled={readOnly}
				/>
				<label>REVISED</label>
			</div>
			<div>
				<Checkbox
					name='ResnStatus'
					value='J'
					checked={value === 'J'}
					indeterminate={isMultiple(value)}
					onChange={handleChange}
					disabled={readOnly}
				/>
				<label>REJECTED</label>
			</div>
		</ResnStatusContainer>
	)
}

const resnColor = {
	'A': '#d3ecd3',
	'V': '#f9ecb9',
	'J': '#f3c0c0'
}

const Resolution = ({resolution, setResolution, showEditing, setShowEditing, readOnly}) =>
	<React.Fragment>
		<Row>
			<Column1
				resolution={resolution}
				setResolution={setResolution}
				readOnly={readOnly}
			/>
			<Column2
				resolution={resolution}
				setResolution={setResolution}
				readOnly={readOnly}
			/>
		</Row>
		<Row>
			<Col
				style={{
					width: '100%',
					position: 'relative',	// position toolbar
					paddingTop: 15			// make room for toolbar
				}}
			>
				<label>Resolution:</label>
				<StyledResnStatus
					value={resolution.ResnStatus}
					onChange={value => setResolution({ResnStatus: value})}
					readOnly={readOnly}
				/>
				<StyledResolutionEditor
					value={isMultiple(resolution.Resolution)? '': resolution.Resolution}
					onChange={value => setResolution({Resolution: value})}
					placeholder={isMultiple(resolution.Resolution)? MULTIPLE_STR: BLANK_STR}
					resnStatus={resolution.ResnStatus}
					readOnly={readOnly}
				/>
			</Col>
		</Row>
		<OtherTabs
			resolution={resolution}
			setResolution={setResolution}
			showEditing={showEditing}
			setShowEditing={setShowEditing}
			readOnly={readOnly}
		/>
	</React.Fragment>

const StyledResnStatus = styled(ResnStatus)`
	width: fit-content;
	background-color: ${({value}) => resnColor[value] || '#fafafa'};
	border: 1px solid #ddd;
	border-bottom: none;
	border-radius: 5px 5px 0 0;
	position: relative;
	bottom: -1px;
	z-index: 1;
`;

const StyledResolutionEditor = styled(ResolutionEditor)`
	background-color: ${({resnStatus}) => resnColor[resnStatus] || '#fafafa'};
	border: 1px solid #ddd;
	border-radius: 0 5px 5px 5px;
`;

function EditStatus({resolution, setResolution, readOnly}) {

	const changeEditStatus = (e) => {
 		let fields = {}
 		if (e.target.name === 'EditStatus') {
	 		if (e.target.checked) {
				fields.EditStatus = e.target.value
				if (e.target.value === 'I') {
					fields.EditInDraft = '1.0'
				}
				else {
					fields.EditInDraft = ''
				}
			}
			else {
				fields.EditStatus = ''
				if (e.target.value === 'I') {
					fields.EditInDraft = ''
				}
			}
		}
		else {
			fields.EditInDraft = e.target.value
			if (e.target.value) {
				fields.EditStatus = 'I'
			}
		}
		setResolution(fields)
	};

	const editInDraft = isMultiple(resolution.EditInDraft)? '': resolution.EditInDraft
	const placeholder = isMultiple(resolution.EditInDraft)? MULTIPLE_STR: null

	return (
		<List onClick={e => e.stopPropagation()}>
			<ListItem>
				<Checkbox
					name='EditStatus'
					value='I'
					indeterminate={isMultiple(resolution.EditStatus)}
					checked={resolution.EditStatus === 'I'}
					onChange={changeEditStatus}
					disabled={readOnly}
				/>
				<label>Implemented in draft:</label>
				<Input
					type='number'
					style={{width: 80}}
					pattern='^\d*(\.\d{0,2})?$'
					step='0.1'
					name='EditInDraft'
					value={editInDraft || ''}
					onChange={changeEditStatus}
					placeholder={placeholder}
					disabled={readOnly}
				/>
			</ListItem>
			<ListItem>
				<Checkbox
					name='EditStatus'
					value='N'
					indeterminate={isMultiple(resolution.EditStatus)}
					checked={resolution.EditStatus === 'N'}
					onChange={changeEditStatus}
					disabled={readOnly}
				/>
				<label>No Change</label>
			</ListItem>
		</List>
	)
}

const StyledTabs = styled(Tabs)`
	position: relative; /* toolbar anchors to top */
	padding-top: 5px;	/* room for toolbar */
	.react-tabs {
		-webkit-tap-highlight-color: transparent;
	}
	.react-tabs__tab-list {
		margin: 0;
		padding: 0;
	}
	.react-tabs__tab {
		display: inline-block;
		border: 1px solid transparent;
		border-bottom: none;
		border-radius: 5px 5px 0 0;
		position: relative;
		bottom: -1px;
		list-style: none;
		padding: 5px 5px;
		cursor: pointer;
		:focus {
			outline: none;
		}
	}
	.react-tabs__tab--selected {
		background: #fafafa;
		border-color: #ddd;
		font-weight: bold;
	}
	.react-tabs__tab--disabled {
		color: GrayText;
		cursor: default;
		font-weight: normal;
	}
	.react-tabs__tab-panel {
		display: none;
		box-sizing: border-box;
		border: 1px solid #ddd;
		background-color: #fafafa;
		border-radius: 5px 5px 5px 5px;
		:first-of-type {
			border-radius: 0 5px 5px 5px;
		}
	}
	.react-tabs__tab-panel--selected {
		display: block;
	}
`;

const OtherTabs = ({resolution, setResolution, showEditing, setShowEditing, readOnly}) =>
	<StyledTabs
		selectedIndex={showEditing? 1: 0}
		onSelect={index => setShowEditing(index === 1)}
	>
		<TabList>
			<Tab>Notes</Tab>
			<Tab>Editing</Tab>
		</TabList>
		<TabPanel>
			<ResolutionEditor
				value={isMultiple(resolution.Notes)? '': resolution.Notes}
				onChange={value => setResolution({Notes: value})}
				placeholder={isMultiple(resolution.Notes)? MULTIPLE_STR: BLANK_STR}
				readOnly={readOnly}
			/>
		</TabPanel>
		<TabPanel>
			<EditStatus
				resolution={resolution}
				setResolution={setResolution}
				readOnly={readOnly}
			/>
			<ResolutionEditor
				value={isMultiple(resolution.EditNotes)? '': resolution.EditNotes}
				onChange={value => setResolution({EditNotes: value})}
				placeholder={isMultiple(resolution.Notes)? MULTIPLE_STR: BLANK_STR}
				readOnly={readOnly}
			/>
		</TabPanel>

	</StyledTabs>


export function Comment({
	cids,
	resolution,
	setResolution,
	showEditing,
	setShowEditing,
	readOnly
}) {
	const comment = resolution
	const cidsStr = cids.join(', ')
	const cidsLabel = cids.length > 1? 'CIDs:': 'CID:'

	return (
		<React.Fragment>
			<Row>
				<FieldLeft label={cidsLabel}>{cidsStr}</FieldLeft>
				<FieldLeft>{renderEntry(comment.Status)}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Commenter:'>{renderCommenter(comment)}</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label='Page/Line:'>{renderPage(comment.Page)} [{comment.C_Page} {comment.C_Line}]</FieldLeft>
				<FieldLeft label='Clause:'>{renderEntry(comment.Clause)} [{comment.C_Clause}]</FieldLeft>
				<FieldLeft label='Category:'>{renderEntry(comment.Category)}</FieldLeft>
			</Row>
			<Row>
				<List label='Comment:'>{renderTextBlock(comment.Comment)}</List>
			</Row>
			<Row>
				<List label='Proposed Change:'>{renderTextBlock(comment.ProposedChange)}</List>
			</Row>
			<Categorization
				resolution={resolution}
				setResolution={setResolution}
				readOnly={readOnly}
			/>
			{resolution.ResolutionID !== null &&
				<Resolution
					resolution={resolution}
					setResolution={setResolution}
					showEditing={showEditing}
					setShowEditing={setShowEditing}
					readOnly={readOnly}
				/>
			}
		</React.Fragment>
	)
}

function recursivelyDiffObjects(l, r) {
	const isObject = o => o != null && typeof o === 'object';
	const isDate = d => d instanceof Date;
	const isEmpty = o => Object.keys(o).length === 0;

	if (l === r) return l;

	if (!isObject(l) || !isObject(r))
		return MULTIPLE;

	if (isDate(l) || isDate(r)) {
		if (l.valueOf() === r.valueOf()) return l;
		return MULTIPLE;
	}

	if (Array.isArray(l) && Array.isArray(r)) {
		if (l.length === r.length) {
			return l.map((v, i) => recursivelyDiffObjects(l[i], r[i]))
		}
	}
	else {
		const deletedValues = Object.keys(l).reduce((acc, key) => {
			return r.hasOwnProperty(key) ? acc : { ...acc, [key]: MULTIPLE };
		}, {});

		return Object.keys(r).reduce((acc, key) => {
			if (!l.hasOwnProperty(key)) return { ...acc, [key]: r[key] }; // return added r key

			const difference = recursivelyDiffObjects(l[key], r[key]);

			if (isObject(difference) && isEmpty(difference) && !isDate(difference)) return acc // return no diff

			return { ...acc, [key]: difference } // return updated key
		}, deletedValues)
	}
}

const NotAvaialble = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

const CommentDetailContainer = styled.div`
	padding: 10px;
	label {
		font-weight: bold;
	}
`;

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`;

class CommentDetail extends React.PureComponent {
	constructor(props) {
		super(props)
		this.state = this.initState(props);
		this.save = debounce(this.doSave, 500);
	}

	componentWillUnmount() {
		this.save.flush();
	}

	initState = (props) => {
		const {comments, selected} = props;
		let diff = {}, originalComments = [];
		if (comments.length > 0) {
			for (let cid of selected) {
				const comment = comments.find(c => c.CID === cid)
				if (comment) {
					diff = recursivelyDiffObjects(diff, comment)
					originalComments.push(comment)
				}
			}
		}
		return {
			origResolution: diff,
			editedResolution: diff,
			comments: originalComments
		};
	}

	doResolutionUpdate = (fields) => {
		console.log('do update', fields)
		this.setState((state, props) => {
			const editedResolution = {...state.editedResolution, ...fields}
			this.save(state.origResolution, editedResolution, state.comments)
			return {
				...state,
				origResolution: editedResolution,
				editedResolution
			}
		})
	}

	doSave = (origResolution, editedResolution, comments) => {
		console.log('save')
		const r = origResolution
		const d = shallowDiff(r, editedResolution)
		const commentUpdates = [], resolutionUpdates = [], resolutionAdds = [];
		for (let c of comments) {
			let commentUpdate = {}, resolutionUpdate = {};
			for (let k in d) {
				if (k === 'AdHoc' || k === 'CommentGroup')
					commentUpdate[k] = d[k]
				else
					resolutionUpdate[k] = d[k]
			}
			if (Object.keys(commentUpdate).length > 0) {
				commentUpdate.id = c.comment_id
				commentUpdates.push(commentUpdate)
			}
			if (Object.keys(resolutionUpdate).length > 0) {
				if (c.resolution_id) {
					resolutionUpdate.id = c.resolution_id
					resolutionUpdates.push(resolutionUpdate)
				}
				else {
					resolutionUpdate.BallotID = c.BallotID
					resolutionUpdate.CommentID = c.CommentID
					resolutionUpdate.comment_id = c.comment_id
					resolutionAdds.push(resolutionUpdate)
				}
			}
		}
		if (commentUpdates.length > 0)
			this.props.updateComments(commentUpdates)
		if (resolutionAdds.length > 0)
			this.props.addResolutions(resolutionAdds)
		if (resolutionUpdates.length > 0)
			this.props.updateResolutions(resolutionUpdates)
	}

	//handleSave = () => this.doSave(this.state.origResolution, this.state.editedResolution, this.state.comments)

	handleAddResolutions = () => {
		const {comments} = this.state;
		//console.log(comments)
		const resolutions = [];
		// Add only one entry per CommentID
		for (let c of comments) {
			if (!resolutions.find(r => r.comment_id === c.comment_id)) {
				resolutions.push({
					BallotID: c.BallotID,
					CommentID: c.CommentID,
					comment_id: c.comment_id
				})
			}
		}
		this.props.addResolutions(resolutions)
	}

 	handleDeleteResolutions = () => {
 		const resolutions = this.state.comments
 			.filter(c => c.ResolutionCount > 0)			// only those with resolutions
 			.map(c => ({id: c.resolution_id}));
 		this.props.deleteResolutions(resolutions)
 	}

 	handleToggleEditComment = () => this.props.setUiEditComment(!this.props.uiEditComment);

	render() {

		let notAvailableStr
		if (this.props.loading) {
			notAvailableStr = 'Loading...'
		}
		else if (this.state.comments.length === 0) {
			notAvailableStr = 'Nothing selected'
		}
		const disableButtons = !!notAvailableStr 	// disable buttons if displaying string

		return(
			<CommentDetailContainer
				style={this.props.style}
				className={this.props.className}
			>
				<TopRow>
					<span></span>
					<span>
						<ActionButton
							name='edit'
							title='Edit resolution'
							disabled={disableButtons}
							isActive={this.props.uiEditComment}
							onClick={this.handleToggleEditComment}
						/>
						<ActionButton
							name='add'
							title='Create alternate resolution'
							disabled={disableButtons}
							onClick={this.handleAddResolutions}
						/>
						<ActionButton
							name='delete'
							title='Delete resolution'
							disabled={disableButtons}
							onClick={this.handleDeleteResolutions}
						/>
					</span>
				</TopRow>
				
				{notAvailableStr?
					<NotAvaialble>
						<span>{notAvailableStr}</span>
				 	</NotAvaialble>:
					<Comment 
						cids={this.state.comments.map(c => c.CID)}
						resolution={this.state.editedResolution}
						setResolution={this.doResolutionUpdate}
						showEditing={this.props.uiEditingTabSelected}
						setShowEditing={this.props.setUiEditingTabSelected}
						readOnly={!this.props.uiEditComment}
					/>
				}
			</CommentDetailContainer>
		)
	}
}

const dataSet = 'comments'
export default connect(
	(state, ownProps) => ({
		ballotId: state[dataSet].ballotId,
		comments: state[dataSet].comments,
		commentsMap: getDataMap(state, dataSet),
		loading: state[dataSet].loading,
		selected: state[dataSet].selected,
		uiEditingTabSelected: state[dataSet].ui['showEditing'],
		uiEditComment: state[dataSet].ui['editComment']
	}),
	(dispatch, ownProps) => ({
		addResolutions: (resolutions) => dispatch(addResolutions(resolutions)),
		deleteResolutions: (resolutions) => dispatch(deleteResolutions(resolutions)),
		updateResolutions: (resolutions) => dispatch(updateResolutions(resolutions)),
		updateComments: (comments) => dispatch(updateComments(comments)),
		setUiEditingTabSelected: (show) => dispatch(uiSetProperty(dataSet, 'showEditing', show)),
		setUiEditComment: (edit) => dispatch(uiSetProperty(dataSet, 'editComment', edit))
	})
)(CommentDetail);

export {renderCommenter, renderPage, renderTextBlock}