import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs'
import {addResolutions, updateResolutions, deleteResolutions, updateComments} from '../actions/comments'
import {uiSetProperty} from '../actions/ui'
import AdHocSelector from './AdHocSelector'
import CommentGroupSelector from './CommentGroupSelector'
import AssigneeSelector from './AssigneeSelector'
import {ResolutionEditor} from './ResolutionEditor'
import {ActionButton, Checkbox, Search} from '../general/Icons'
import {shallowDiff} from '../lib/utils'
import {getDataMap} from '../selectors/dataMap'
import {debounce} from '../lib/utils'

const Label = styled.label`
	font-weight: bold;
	white-space: nowrap
`;

const Multiple = styled.span`
	color: GrayText;
	font-style: italic;
`;

const FlexRow = styled.div`
	display: flex;
	flex-direction: row;
`;

const FlexCol = styled.div`
	display: flex;
	flex-direction: column;
`;

const Content = ({children}) => {
	if (typeof children === 'string') {
		if (children === '<multiple>') {
			return <Multiple>{children}</Multiple>
		}
		else {
			return <span>{children}</span>
		}
	}
	else {
		return children
	}
}

const Entry = ({label, children, ...otherProps}) =>
	<FlexRow {...otherProps}>
		{label && <Label>{label}:&nbsp;</Label>}
		<Content children={children} />
	</FlexRow>

const LabelValuePair = styled.div`
	display: flex;
	align-items: center;
	margin: 10px 0;
	& label {
		width: 150px;
	}
`;

function CategorizationRow({
	style,
	className,
	resolution,
	setResolution
}) {

	return (
		<Row1>
			<LabelValuePair>
				<Label>Ad-hoc:</Label>
				<AdHocSelector
					width={300}
					value={resolution.AdHoc === '<multiple>'? '': resolution.AdHoc || ''}
					onChange={value => setResolution({AdHoc: value})}
					placeholder={resolution.AdHoc === '<multiple>'? '<multiple>': '<blank>'}
				/>
			</LabelValuePair>
			<LabelValuePair>
				<Label>Comment Group:</Label>
				<CommentGroupSelector
					width={300}
					value={resolution.CommentGroup === '<multiple>'? '': resolution.CommentGroup}
					onChange={value => setResolution({CommentGroup: value})}
					placeholder={resolution.CommentGroup === '<multiple>'? '<multiple>': '<blank>'}
				/>
			</LabelValuePair>
		</Row1>
	)
}

function Column1({
	resolution,
	setResolution,
	style,
	className
}) {
	return (
		<FlexCol
			style={style}
			className={className}
		>
			<LabelValuePair>
				<Label>Assignee:</Label>
				<AssigneeSelector
					width={300}
					value={(resolution.AssigneeSAPIN || resolution.AssigneeName) === '<multiple>'?
						{SAPIN: null, Name: null}:
						{SAPIN: resolution.AssigneeSAPIN, Name: resolution.AssigneeName}}
					onChange={({SAPIN, Name}) => setResolution({AssigneeSAPIN: SAPIN, AssigneeName: Name})}
					placeholder={(resolution.AssigneeSAPIN || resolution.AssigneeName) === '<multiple>'? '<multiple>': 'Not assigned'}
				/>
			</LabelValuePair>
			<LabelValuePair>
				<Label>Submission:</Label>
				<Search
					value={resolution.Submission || ''}
					onChange={e => setResolution({Submission: e.target.value})}
					placeholder='None'
				/>
			</LabelValuePair>
		</FlexCol>
	)
}

function Column2({
	resolution,
	setResolution,
	style,
	className
}) {

	function changeApproved(e) {
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
		<FlexCol
			style={style}
			className={className}
		>
			<div>
				<Checkbox
					name='ReadyForMotion'
					indeterminate={resolution.ReadyForMotion === '<multiple>'}
					checked={!!resolution.ReadyForMotion}
					onChange={e => setResolution({ReadyForMotion: e.target.checked})}
				/>
				<Label>Ready for motion</Label>
			</div>
			<div>
				<Checkbox
					name='Approved'
					indeterminate={resolution.ApprovedByMotion === '<multiple>'}
					checked={!!resolution.ApprovedByMotion}
					onChange={changeApproved}
				/>
				<Label>Approved by motion: </Label>
				<Search
					name='ApprovedByMotion'
					value={resolution.ApprovedByMotion || ''}
					onChange={changeApproved}
				/>
			</div>
		</FlexCol>
	)
}

const ResnStatusContainer = styled.div`
	display: flex;
	& div {
		display: flex;
		align-items: center;
		margin: 0 10px;
	}
`;

function ResnStatus({
		style,
		className,
		value,
		onChange
	}) {

	function handleChange(e) {
		const value = e.target.checked? e.target.value: '';
		onChange(value);
		e.stopPropagation();
	}

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
					indeterminate={value === '<multiple>'}
					onChange={handleChange}
				/>
				<label>ACCEPTED</label>
			</div>
			<div>
				<Checkbox
					name='ResnStatus'
					value='V'
					checked={value === 'V'}
					indeterminate={value === '<multiple>'}
					onChange={handleChange}
				/>
				<label>REVISED</label>
			</div>
			<div>
				<Checkbox
					name='ResnStatus'
					value='J'
					checked={value === 'J'}
					indeterminate={value === '<multiple>'}
					onChange={handleChange}
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

const Row1 = styled.div`
	display: flex;
	justify-content: space-between;
`;

function Resolution({resolution, setResolution}) {

	return (
		<React.Fragment>
			<Row1>
				<Column1
					resolution={resolution}
					setResolution={setResolution}
				/>
				<Column2
					resolution={resolution}
					setResolution={setResolution}
				/>
			</Row1>
			<FlexCol style={{marginTop: '10px'}}>
				<Label>Resolution:</Label>
				<StyledResnStatus
					value={resolution.ResnStatus}
					onChange={value => setResolution({ResnStatus: value})}
				/>
				<StyledResolutionEditor
					value={resolution.Resolution === '<multiple>'? '': resolution.Resolution}
					onChange={value => setResolution({Resolution: value})}
					placeholder={resolution.Resolution === '<multiple>'? '<multiple>': '(Blank)'}
					resnStatus={resolution.ResnStatus}
				/>
			</FlexCol>
		</React.Fragment>
	)
}

const StyledResnStatus = styled(ResnStatus)`
	width: fit-content;
	background-color: ${({value}) => resnColor[value] || '#fff'};
	border: 1px solid #aaa;
	border-bottom: none;
	border-radius: 5px 5px 0 0;
	position: relative;
	bottom: -1px;
	z-index: 1;
`;

const StyledResolutionEditor = styled(ResolutionEditor)`
	background-color: ${({resnStatus}) => resnColor[resnStatus] || '#fff'};
	border: 1px solid #aaa;
	border-radius: 0 5px 5px 5px;
`;

const EditStatusContainer = styled.div`
	display: flex;
	flex-direction: column;
	margin: 10px;
`;

function EditStatus({resolution, setResolution}) {

	function changeEditStatus(e) {
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
	}

	const editInDraft = resolution.EditInDraft === '<multiple>'? '': resolution.EditInDraft
	const placeholder = resolution.EditInDraft === '<multiple>'? 'Multiple': null

	return (
		<EditStatusContainer onClick={e => e.stopPropagation()}>
			<div>
				<Checkbox
					name='EditStatus'
					value='I'
					indeterminate={resolution.EditStatus === '<multiple>'}
					checked={resolution.EditStatus === 'I'}
					onChange={changeEditStatus}
				/>
				<Label>Implemented in draft:</Label>
				<Search
					width={40}
					name='EditInDraft'
					value={editInDraft || ''}
					onChange={changeEditStatus}
					placeholder={placeholder}
				/>
			</div>
			<div>
				<Checkbox
					name='EditStatus'
					value='N'
					indeterminate={resolution.EditStatus === '<multiple>'}
					checked={resolution.EditStatus === 'N'}
					onChange={changeEditStatus}
				/>
				<Label>No Change</Label>
			</div>
		</EditStatusContainer>
	)
}

const StyledTabs = styled(Tabs)`
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
		background: #fff;
		border-color: #aaa;
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
		border: 1px solid #aaa;
		border-radius: 5px 5px 5px 5px;
		:first-of-type {
			border-radius: 0 5px 5px 5px;
		}
	}
	.react-tabs__tab-panel--selected {
		display: block;
	}
`;

function OtherTabs({style, resolution, setResolution, showEditing, setShowEditing}) {

	return (
		<StyledTabs
			style={style}
			selectedIndex={showEditing? 1: 0}
			onSelect={index => setShowEditing(index === 1)}
		>
			<TabList>
				<Tab>Notes</Tab>
				<Tab>Editing</Tab>
			</TabList>
			<TabPanel>
				<ResolutionEditor
					value={resolution.Notes}
					onChange={value => setResolution({Notes: value})}
				/>
			</TabPanel>
			<TabPanel>
				<EditStatus
					resolution={resolution}
					setResolution={setResolution}
				/>
				<ResolutionEditor
					value={resolution.EditNotes}
					onChange={value => setResolution({EditNotes: value})}
				/>
			</TabPanel>

		</StyledTabs>
	)
}

const TextBlockContainer = styled.div`
	& p {
		margin: 8px 0;
	}
	& p:first-of-type {
		margin: 0;
	}
`;

const TextBlock = ({children}) => (
	typeof children === 'string'?
		<TextBlockContainer>
			{children && children.split('\n').map((line, i) => <p key={i}>{line}</p>)}
		</TextBlockContainer>:
		children
)

function Comment(props) {
	const {cids, resolution, setResolution} = props
	const comment = resolution

	const Commenter = (props) => (
		<Entry label='Commenter' {...props} >
			<Content>{comment.CommenterName}</Content>
			{comment.Vote && <React.Fragment>&nbsp;(<Content>{comment.Vote}</Content>)</React.Fragment>}
		</Entry>
	)

	const cidsStr = cids.join(', ')
	const cidsLabel = cids.length > 1? 'CIDs': 'CID'

	const page = typeof comment.Page === 'number'? comment.Page.toFixed(2): comment.Page;

	return (
		<React.Fragment>

			<FlexRow style={{marginTop: '10px', marginBottom: '10px', justifyContent: 'space-between'}}>
				<Entry label={cidsLabel}>{cidsStr}</Entry>
				<Entry>{comment.Status}</Entry>
			</FlexRow>

			<FlexRow style={{marginTop: '10px', marginBottom: '10px'}}>
				<Commenter style={{width: '40%'}} />
				{comment.MustSatisfy !== 0 && <Entry label='Must Satisfy'>{comment.MustSatisfy === '<multiple>'? comment.MustSatisfy: '\u2714'}</Entry>}
			</FlexRow>

			<FlexRow style={{marginTop: '10px', marginBottom: '10px'}}>
				<Entry style={{width: '33%'}} label='Page/Line'>{page}</Entry>
				<Entry style={{width: '33%'}} label='Clause'>{comment.Clause}</Entry>
				<Entry label='Category'>{comment.Category}</Entry>
			</FlexRow>
			
			<FlexCol style={{marginTop: '10px', marginBottom: '10px'}}>
				<Label>Comment:</Label>
				<TextBlock>{comment.Comment}</TextBlock>
			</FlexCol>

			<FlexCol style={{marginTop: '10px', marginBottom: '10px'}}>
				<Label>Proposed Change:</Label>
				<TextBlock>{comment.ProposedChange}</TextBlock>
			</FlexCol>

			<CategorizationRow
				resolution={resolution}
				setResolution={setResolution}
			/>

			{resolution.ResolutionID !== null &&
				<Resolution
					resolution={resolution}
					setResolution={setResolution}
				/>
			}

			{resolution.ResolutionID !== null &&
				<OtherTabs
					style={{marginTop: '10px', width: '100%'}}
					resolution={resolution}
					setResolution={setResolution}
					showEditing={props.showEditing}
					setShowEditing={props.setShowEditing}
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

	if (!isObject(l) || !isObject(r)) {
		return '<multiple>'
	}

	if (isDate(l) || isDate(r)) {
		if (l.valueOf() === r.valueOf()) return l;
		return '<multiple>';
	}

	if (Array.isArray(l) && Array.isArray(r)) {
		if (l.length === r.length) {
			return l.map((v, i) => recursivelyDiffObjects(l[i], r[i]))
		}
	}
	else {
		const deletedValues = Object.keys(l).reduce((acc, key) => {
			return r.hasOwnProperty(key) ? acc : { ...acc, [key]: '<multiple>' };
		}, {});

		return Object.keys(r).reduce((acc, key) => {
			if (!l.hasOwnProperty(key)) return { ...acc, [key]: r[key] }; // return added r key

			const difference = recursivelyDiffObjects(l[key], r[key]);

			if (isObject(difference) && isEmpty(difference) && !isDate(difference)) return acc // return no diff

			return { ...acc, [key]: difference } // return updated key
		}, deletedValues)
	}
}

class CommentDetail extends React.Component {
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
		this.setState((state, props) => {
			const editedResolution = {...state.editedResolution, ...fields}
			this.save(state.origResolution, editedResolution, state.comments)
			return {
				...state,
				editedResolution
			}
		})
	}

	doSave = (origResolution, editedResolution, comments) => {
		const r = origResolution
		const d = shallowDiff(r, editedResolution)
		const commentUpdates = [], resolutionUpdates = [];
		for (let c of comments) {
			let commentUpdate = {}, resolutionUpdate = {};
			for (let o of Object.keys(d)) {
				if (o === 'AdHoc' || o === 'CommentGroup') {
					if (c[o] !== d[o])
						commentUpdate[o] = d[o]
				}
				else {
					if (c[o] !== d[o])
						resolutionUpdate[o] = d[o]
				}
			}
			if (Object.keys(commentUpdate).length > 0) {
				commentUpdate.BallotID = c.BallotID
				commentUpdate.CommentID = c.CommentID
				console.log(commentUpdate)
				commentUpdates.push(commentUpdate)
			}
			if (Object.keys(resolutionUpdate).length > 0) {
				resolutionUpdate.BallotID = c.BallotID
				resolutionUpdate.CommentID = c.CommentID
				resolutionUpdate.ResolutionID = c.ResolutionID
				console.log(resolutionUpdate)
				resolutionUpdates.push(resolutionUpdate)
			}
		}
		if (commentUpdates.length > 0)
			this.props.updateComments(this.props.ballotId, commentUpdates)
		if (resolutionUpdates.length > 0)
			this.props.updateResolutions(this.props.ballotId, resolutionUpdates)
	}

	handleSave = () => this.doSave(this.state.origResolution, this.state.editedResolution, this.state.comments)

	handleAddResolutions = () => {
		const cids =
			[...new Set(this.state.comments.map(c => c.CommentID))]	// array of unique CommentIDs (elliminate duplicates)
			.map(cid => ({CommentID: cid}))	
		this.props.addResolutions(this.props.ballotId, cids)
	}

 	handleDeleteResolutions = () => {
 		const resolutions = this.state.comments
 			.filter(c => c.ResolutionCount)			// only those with resolutions
 			.map(c => ({CommentID: c.CommentID, ResolutionID: c.ResolutionID}))
 		this.props.deleteResolutions(this.props.ballotId, resolutions)
 	}

 	close = () => {}

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
			<div
				style={this.props.style}
				className={this.props.className}
			>
				<FlexRow style={{justifyContent: 'flex-end', flexWrap: 'nowrap'}}>
					<ActionButton name='save' title='Save Changes' disabled={disableButtons} onClick={this.handleSave} />
					<ActionButton name='add' title='Create Alternate Resolution' disabled={disableButtons} onClick={this.handleAddResolutions} />
					<ActionButton name='delete' title='Delete Resolution' disabled={disableButtons} onClick={this.handleDeleteResolutions} />
					<ActionButton name='close' title='Close' onClick={this.close} />
				</FlexRow>
				
				{notAvailableStr?
					<FlexRow style={{minHeight: '200px', justifyContent:'center'}}>
						<span style={{fontSize: '1em', color: 'GrayText'}}>{notAvailableStr}</span>
				 	</FlexRow>:
					<Comment 
						cids={this.state.comments.map(c => c.CID)}
						resolution={this.state.editedResolution}
						setResolution={this.doResolutionUpdate}
						showEditing={this.props.showEditing}
						setShowEditing={this.props.setShowEditing}
					/>
				}
			</div>
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
		showEditing: state[dataSet].ui['showEditing']
	}),
	(dispatch, ownProps) => ({
		addResolutions: (ballotId, cids) => dispatch(addResolutions(ballotId, cids)),
		deleteResolutions: (ballotId, resolutions) => dispatch(deleteResolutions(ballotId, resolutions)),
		updateResolutions: (ballotId, resolutions) => dispatch(updateResolutions(ballotId, resolutions)),
		updateComments: (ballotId, comments) => dispatch(updateComments(ballotId, comments)),
		setShowEditing: (show) => dispatch(uiSetProperty(dataSet, 'showEditing', show))
	})
)(CommentDetail);