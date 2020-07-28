/*
 * Comment detail
 */
import React from 'react'
import {useHistory, useLocation} from 'react-router-dom'
import {connect} from 'react-redux'
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs'
import {Row, Col} from 'react-grid-system'
import {addResolutions, updateResolutions, deleteResolutions} from '../actions/comments'
import {ResolutionEditor, BasicEditor} from './ResolutionEditor'
import AssigneeSelector from './AssigneeSelector'
import CommentGroupSelector from './CommentGroupSelector'
import {ActionButton, Checkbox, Search} from '../general/Icons'
import {shallowDiff} from '../lib/compare'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

//const Row = props => <div css={{display: 'flex', flexDirection: 'row'}} {...props} />
//const Col = props => <div css={{display: 'flex', flexDirection: 'column'}} {...props} />

const Label = (props) => <label css={css`font-weight: bold;	white-space: nowrap`} {...props} />

const multipleCss = css`
	color: GrayText;
	font-style: italic`

const Content = ({children}) => 
	typeof children === 'string'
		? <span css={children === '<multiple>' && multipleCss} children={children} />
		: children;

const Entry = ({label, children, ...otherProps}) =>
	<Col {...otherProps}>
		{label && <Label>{label}:&nbsp;</Label>}
		<Content children={children} />
	</Col>

function Resolution(props) {
	const {resolution, setResolution} = props
	//console.log(resolution)

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

	if (resolution.ResolutionID === null) {
		return null
	}

 	return (
 		<React.Fragment>
 			<Row>
				<Col xs={12} md={8}>
					<Row align='center' style={{marginTop: '10px', marginBottom: '10px'}}>
						<Col xs={6} md={4}><Label>Comment Group:</Label></Col>
						<Col xs='content'>
							<CommentGroupSelector
								css={css`display: inline-block; width: 200px`}
								value={resolution.CommentGroup === '<multiple>'? '': resolution.CommentGroup}
								onChange={value => setResolution({CommentGroup: value})}
								placeholder={resolution.CommentGroup === '<multiple>'? '<multiple>': '<blank>'}
							/>
						</Col>
					</Row>
					<Row align='center' style={{marginTop: '10px', marginBottom: '10px'}}>
						<Col xs={6} md={4}><Label>Assignee:</Label></Col>
						<Col xs='content'>
							<AssigneeSelector
								css={css`display: inline-block; width: 200px`}
								value={resolution.AssigneeSAPIN || 0}
								onChange={value => setResolution({AssigneeSAPIN: value})}
							/>
						</Col>
					</Row>
					<Row align='center' style={{marginTop: '10px', marginBottom: '10px'}}>
						<Col xs={6} md={4}><Label>Submission:</Label></Col>
						<Col xs='content'>
							<Search
								value={resolution.Submission || ''}
								onChange={e => setResolution({Submission: e.target.value})}
								placeholder='None'
							/>
						</Col>
					</Row>
				</Col>
				<Col xs={12} md={4} style={{marginTop: '10px', marginBottom: '10px'}}>
					<Row align='center'>
						<Col xs={12}>
							<Checkbox
								name='ReadyForMotion'
								indeterminate={resolution.ReadyForMotion === '<multiple>'}
								checked={!!resolution.ReadyForMotion}
								onChange={e => setResolution({ReadyForMotion: e.target.checked})}
							/>
							<Label>Ready for motion</Label>
						</Col>
					</Row>
					<Row align='center'>
						<Col xs='content'>
							<Checkbox
								name='Approved'
								indeterminate={resolution.ApprovedByMotion === '<multiple>'}
								checked={!!resolution.ApprovedByMotion}
								onChange={changeApproved}
							/>
							<Label>Approved</Label>
						</Col>
						<Col>
							<Search
								name='ApprovedByMotion'
								value={resolution.ApprovedByMotion || ''}
								onChange={changeApproved}
							/>
						</Col>
					</Row>
				</Col>
				<Col xs={12} style={{marginTop: '10px'}}>
					<Label>Resolution:</Label><br />
					<ResolutionEditor
						value={resolution.Resolution}
						onChange={(ResnStatus, Resolution) => setResolution({ResnStatus, Resolution})}
						placeholder={resolution.Resolution === '<multiple>'? '<multiple>': '<blank>'}
					/>
				</Col>
				
			</Row>
		</React.Fragment>
	)
}

function EditStatus(props) {
	const {resolution, setResolution} = props

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
		<div onClick={e => e.stopPropagation()}>
			<Row>
				<Col xs='content' align='center'>
					<Checkbox
						name='EditStatus'
						value='I'
						indeterminate={resolution.EditStatus === '<multiple>'}
						checked={resolution.EditStatus === 'I'}
						onChange={changeEditStatus}
					/>
					<Label>Implemented in draft:</Label>
					<Search
						css={{width: '40px'}}
						name='EditInDraft'
						value={editInDraft || ''}
						onChange={changeEditStatus}
						placeholder={placeholder}
					/>
				</Col>
			</Row>
			<Row>
				<Col xs='content' align='center'>
					<Checkbox
						name='EditStatus'
						value='N'
						indeterminate={resolution.EditStatus === '<multiple>'}
						checked={resolution.EditStatus === 'N'}
						onChange={changeEditStatus}
					/>
					<Label>No Change</Label>
				</Col>
			</Row>
		</div>
	)
}

function OtherTabs(props) {
	const {resolution, setResolution} = props

	const tabsCss = css`
		.react-tabs {
			-webkit-tap-highlight-color: transparent;
		}
		.react-tabs__tab-list {
			border-bottom: 1px solid #aaa;
			margin: 0;
			padding: 0;
		}
		.react-tabs__tab {
			display: inline-block;
			border: 1px solid transparent;
			border-bottom: none;
			bottom: -1px;
			position: relative;
			list-style: none;
			padding: 5px 5px;
			cursor: pointer;
			:focus {
				/*box-shadow: 0 0 5px hsl(208, 99%, 50%);
				border-color: hsl(208, 99%, 50%);*/
				outline: none;
			}
			/*:focus:after {
				content: "";
				position: absolute;
				height: 5px;
				left: -4px;
				right: -4px;
				bottom: -5px;
				background: #fff;
			}*/
		}
		.react-tabs__tab--selected {
			background: #fff;
			border-color: #aaa;
			color: black;
			border-radius: 5px 5px 0 0;
			font-weight: bold;
		}
		.react-tabs__tab--disabled {
			color: GrayText;
			cursor: default;
			font-weight: normal;
		}
		.react-tabs__tab-panel {
			display: none;
			border: 1px solid #aaa;
			border-top: none;
			box-sizing: border-box;
		}
		.react-tabs__tab-panel--selected {
			display: block;
		}`

	return (
		<Tabs css={tabsCss}>
			<TabList>
				<Tab>Editing</Tab>
				<Tab>Notes</Tab>
			</TabList>
			<TabPanel>
				<BasicEditor
					value={resolution.EditNotes}
					onChange={value => setResolution({EditNotes: value})}
				>
					<EditStatus
						resolution={resolution}
						setResolution={setResolution}
					/>
				</BasicEditor>
			</TabPanel>
			<TabPanel>
				<BasicEditor
					value={resolution.Notes}
					onChange={value => setResolution({Notes: value})}
				/>
			</TabPanel>
		</Tabs>
	)
}

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

	return (
		<React.Fragment>
			<Row justify='between' style={{marginTop: '10px', marginBottom: '10px'}}>
				<Entry xs='content' label={cidsLabel}>{cidsStr}</Entry>
				<Entry xs='content'>{comment.Status}</Entry>
			</Row>
			<Row style={{marginTop: '10px', marginBottom: '10px'}}>
				<Commenter xs={8} md={6} />
				{comment.MustSatisfy !== 0 && <Entry xs='content' label='Must Satisfy'>{comment.MustSatisfy === '<multiple>'? comment.MustSatisfy: '\u2714'}</Entry>}
			</Row>

			<Row style={{marginTop: '10px', marginBottom: '10px'}}>
				<Entry xs={6} md={4} label='Page/Line'>{comment.Page}</Entry>
				<Entry xs={6} md={4} label='Clause'>{comment.Clause}</Entry>
				<Entry xs='content' label='Category'>{comment.Category}</Entry>
			</Row>
			
			<Row style={{marginTop: '10px', marginBottom: '10px'}}>
				<Entry label='Comment'>{comment.Comment}</Entry>
			</Row>

			<Row style={{marginTop: '10px', marginBottom: '10px'}}>
				<Entry label='Proposed Change'>{comment.ProposedChange}</Entry>
			</Row>

			<Resolution
				resolution={resolution}
				setResolution={setResolution}
			/>

			<Row style={{marginTop: '10px'}}>
				<Col xs={12}>
					<OtherTabs
						resolution={resolution}
						setResolution={setResolution}
					/>
				</Col>
			</Row>
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

function CommentDetail(props) {
	const history = useHistory()
	const location = useLocation()

	const [resolution, setResolution] = React.useState()
	const origResolution = React.useRef()
	const [currentComments, setCurrentComments] = React.useState([])
	const [unavailableComments, setUnavailableComments] = React.useState([])

	React.useEffect(() => {
		const {comments} = props
		const cids = props.cidsStr.split(',')
		if (comments.length > 0) {
			let c, r = {}, u = [], a = []
			for (let cid of cids) {
				c = comments.find(c => c.CommentID.toString() === cid || `${c.CommentID}.${c.ResolutionID}` === cid)
				if (c) {
					r = recursivelyDiffObjects(r, c)
					a.push(c)
				}
				else {
					u.push(cid)
				}
			}
			setUnavailableComments(u)
			setCurrentComments(a)
			if (r &&
				(!resolution ||
				 r.BallotID !== resolution.BallotID ||
				 r.CommentID !== resolution.CommentID ||
				 r.ResolutionID !== resolution.ResolutionID)) {
				setResolution(r)
				origResolution.current = r
			}
		}
	}, [props.comments, props.cidsStr])

	function doResolutionUpdate(fields) {
		const r = {...resolution, ...fields}
		console.log(fields, resolution, r)
		setResolution(r)
	}

	function handleSave() {
		const r = origResolution.current
		const d = shallowDiff(r, resolution)
		const updates = []
		for (let c of currentComments) {
			let n = {}
			for (let o of Object.keys(d)) {
				if (c[o] !== d[o]) {
					n[o] = d[o]
				}
			}
			console.log(n)
			if (Object.keys(n).length > 0) {
				n.BallotID = c.BallotID
				n.CommentID = c.CommentID
				n.ResolutionID = c.ResolutionID
				updates.push(n)
			}
		}
		if (updates.length > 0) {
			props.updateResolutions(props.ballotId, updates)
		}
	}
/*
	function findCommentIndex(cid) {
		const {comments, commentsMap} = props
		return commentsMap.findIndex(i => {
			let c = comments[i]
			return c.CommentID.toString() === cid || `${c.CommentID}.${c.ResolutionID}` === cid
		})
	}

	function previousComment() {
		const {comments, commentsMap, cidsStr} = props
		let cid = cidsStr[0]
		var i = findCommentIndex(cid) - 1
		if (i === -2) {
			i = 0
		}
		else if (i === -1) {
			i = commentsMap.length - 1
		}
		history.replace(location.pathname + '?CIDs=' + comments[commentsMap[i]].CID)
	}

	function nextComment() {
		const {comments, commentsMap, cidsStr} = props
		let cid = cidsStr[0]
		var i = findCommentIndex(cid) + 1
		if (i >= commentsMap.length) {
			i = 0
		}
		history.replace(location.pathname + '?CIDs=' + comments[commentsMap[i]].CID)
	}
*/
	async function handleAddResolutions() {
		let cids = currentComments.map(c => c.CommentID)
		cids = cids.filter((cid, i) => cids.indexOf(cid) === i)	// elliminate duplicates
		cids = cids.map(cid => ({CommentID: cid}))
		const resIds = await props.addResolutions(props.ballotId, cids)
		console.log(resIds)
		if (resIds && resIds.length) {
			const cids = resIds.map(r => r.CID).join(',')
			history.replace(location.pathname + '?CIDs=' + cids)
		}
	}

 	async function handleDeleteResolutions() {
 		const resolutions = currentComments
 			.filter(c => c.ResolutionCount)
 			.map(c => ({CommentID: Math.floor(c.CommentID), ResolutionID: c.ResolutionID}))
 		await props.deleteResolutions(props.ballotId, resolutions)
 		let cids = resolutions.map(r => r.CommentID)
 		cids = cids.filter((cid, i) => cids.indexOf(cid) === i)	// elliminate duplicates
 		history.replace(location.pathname + '?CIDs=' + cids.toString())
 	}

 	function close() {
 		history.replace(location.pathname)
 	}

	let notAvailableStr
	if (props.loading) {
		notAvailableStr = 'Loading...'
	}
	else if (unavailableComments.length) {
		notAvailableStr = unavailableComments.length > 1
			? `CIDs ${unavailableComments.join(', ')} not available`
			: `CID ${unavailableComments[0]} is not avilable`
	}
	else if (!resolution) {
		notAvailableStr = '!! Unexpected !!'
	}
	const disableButtons = !!notAvailableStr 	// disable buttons if displaying string

	console.log(props.cidsStr, notAvailableStr, currentComments)
	return(
		<React.Fragment>
			<Row justify='end' nowrap>
				<ActionButton name='save' title='Save Changes' disabled={disableButtons} onClick={handleSave} />
				<ActionButton name='add' title='Create Alternate Resolution' disabled={disableButtons} onClick={handleAddResolutions} />
				<ActionButton name='delete' title='Delete Resolution' disabled={disableButtons} onClick={handleDeleteResolutions} />
				<ActionButton name='close' title='Close' onClick={close} />
			</Row>
			
			{notAvailableStr
				? <Row justify='center' align='center' style={{minHeight: '200px'}}>
					<span style={{fontSize: '1em', color: 'GrayText'}}>{notAvailableStr}</span>
				  </Row>
				: <Comment cids={currentComments.map(c => c.CID)} resolution={resolution} setResolution={doResolutionUpdate} />
			}
		</React.Fragment>
	)
}

export default connect(
	(state, ownProps) => {
		const {comments} = state
		return {
			ballotId: comments.ballotId,
			comments: comments.comments,
			commentsMap: comments.commentsMap,
			loading: comments.getComments
		}
	},
	(dispatch, ownProps) => {
		return {
			addResolutions: (ballotId, cids) => dispatch(addResolutions(ballotId, cids)),
			deleteResolutions: (ballotId, resolutions) => dispatch(deleteResolutions(ballotId, resolutions)),
			updateResolutions: (ballotId, resolutions) => dispatch(updateResolutions(ballotId, resolutions)),
		}
	}
)(CommentDetail);