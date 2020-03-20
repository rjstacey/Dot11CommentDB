/*
 * Comment detail
 */
import React, {useState, useEffect, useRef} from 'react'
import {useHistory, useParams, useLocation} from 'react-router-dom'
import {connect} from 'react-redux'
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs'
import cx from 'classnames'
import {addResolutions, updateResolutions, deleteResolutions, getComments} from './actions/comments'
import {setBallotId} from './actions/ballots'
import {ResolutionEditor, BasicEditor} from './ResolutionEditor'
import BallotSelector from './BallotSelector'
import AssigneeSelector from './AssigneeSelector'
import {ActionButton} from './Icons'
import styles from './css/CommentDetail.css'

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

	let commentGroupClassName = cx({
		[styles.CommentGroupInput]: true,
		[styles.Multiple]: resolution.CommentGroup === '<multiple>'
	})
	let submissionClassName = cx({
		[styles.SubmissionInput]: true,
		[styles.Multiple]: resolution.Submission === '<multiple>'
	})

	let approvedByClassName = cx({
		[styles.ApprovedByMotion]: true,
		[styles.Multiple]: resolution.ApprovedByMotion === '<multiple>'
	})

	const placeholder = resolution.Resolution === '<multiple>'? '<multiple>': '<blank>'

 	return (
 		<React.Fragment>
 			<div className={styles.row} style={{justifyContent: 'space-between'}}>
				<div className={styles.column}>
					<span style={{display: 'inline-flex'}}>
						<label style={{width: 150}}>Comment Group:</label>
						<input
							className={commentGroupClassName}
							type='search'
							name='CommentGroup'
							value={resolution.CommentGroup || ''}
							onChange={e => setResolution({CommentGroup: e.target.value})}
							placeholder='None'
						/>
					</span>
					<span style={{display: 'inline-flex'}}>
						<label style={{width: 150}}>Assignee:</label>
						<AssigneeSelector
							value={resolution.AssigneeSAPIN || 0}
							onChange={value => setResolution({AssigneeSAPIN: value})}
						/>
					</span>
					<span style={{display: 'inline-flex'}}>
						<label style={{width: 150}}>Submission:</label>
						<input
							className={submissionClassName}
							type='search'
							name='Submission'
							value={resolution.Submission || ''}
							onChange={e => setResolution({Submission: e.target.value})}
							placeholder='None'
						/>
					</span>
				</div>
				<div className={styles.column} >
					<label>
						<input
							className='checkbox'
							type='checkbox'
							name='ReadyForMotion'
							ref={el => el && (el.indeterminate = resolution.ReadyForMotion === '<multiple>')}
							checked={resolution.ReadyForMotion || false}
							onChange={e => setResolution({ReadyForMotion: e.target.checked})}
						/>
						Ready for motion
					</label>
					<label>
						<input
							className='checkbox'
							type='checkbox'
							name='Approved'
							ref={el => el && (el.indeterminate = resolution.ApprovedByMotion === '<multiple>')}
							checked={!!resolution.ApprovedByMotion}
							onChange={changeApproved}
						/>
						Approved&nbsp;
						<input
							className={approvedByClassName}
							type='search'
							name='ApprovedByMotion'
							value={resolution.ApprovedByMotion || ''}
							onChange={changeApproved}
						/>
					</label>
				</div>
			</div>
			<div className={styles.Resolution}>
				<ResolutionEditor
					value={resolution.Resolution}
					onChange={(ResnStatus, Resolution) => setResolution({ResnStatus, Resolution})}
					placeholder={placeholder}
				/>
			</div>
			<div className={styles.tab}>
				<OtherTabs
					resolution={resolution}
					setResolution={setResolution}
				/>
			</div>
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
		e.stopPropagation()
	}

	const editInDraft = resolution.EditInDraft === '<multiple>'? '': resolution.EditInDraft
	const placeholder = resolution.EditInDraft === '<multiple>'? 'Multiple': null

	return (
		<div className={styles.column}>
			<span>
				<label>
					<input
						className='checkbox'
						type='checkbox'
						name='EditStatus'
						value='I'
						ref={el => el && (el.indeterminate = resolution.EditStatus === '<multiple>')}
						checked={resolution.EditStatus === 'I'}
						onChange={changeEditStatus}
					/>
					Implemented in draft:
				</label>
				<input
					className={styles.EditedInDraft}
					type='text'
					name='EditInDraft'
					value={editInDraft || ''}
					onChange={changeEditStatus}
					placeholder={placeholder}
				/>
			</span>
			<span>
				<label>
					<input
						className='checkbox'
						type='checkbox'
						name='EditStatus'
						value='N'
						ref={el => el && (el.indeterminate = resolution.EditStatus === '<multiple>')}
						checked={resolution.EditStatus === 'N'}
						onChange={changeEditStatus}
					/>
					No Change
				</label>
			</span>		
		</div>
	)
}

function OtherTabs(props) {
	const {resolution, setResolution} = props

	return (
		<Tabs
			className={styles.tabs}
			selectedTabClassName={styles.tab_selected}
			disabledTabClassName={styles.tab_disabled}
			selectedTabPanelClassName={styles.tabPanel_selected}
		>
			<TabList className={styles.tabList}>
				<Tab className={styles.tab}>Editing</Tab>
				<Tab className={styles.tab}>Notes</Tab>
			</TabList>
			<TabPanel className={styles.tabPanel}>
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
			<TabPanel className={styles.tabPanel}>
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

	function Entry({className, label, content}) {
		return (
			<div className={className}>
				<label>{label}:</label>&nbsp;
				<div className={cx(content === '<multiple>' && styles.Multiple)}>
					{content}
				</div>
			</div>
		)
	}

	const mustSatisfyText = comment.MustSatisfy === '<multiple>'
		? comment.MustSatisfy
		: '\u2714'

	const commenterEl = (
		<span>
			<span className={cx(comment.CommenterName === '<multiple>' && styles.Multiple)}>
				{comment.CommenterName}
			</span>&nbsp;
			(<span className={cx(comment.Vote === '<multiple>' && styles.Multiple)}>
				{comment.Vote}
			</span>)
		</span>
	)

	const cidsStr = cids.join(', ')
	const cidsLabel = cids.length > 1? 'CIDs': 'CID'

	return (
		<React.Fragment>
			<div className={styles.row}>
				<Entry className={styles.CID} label={cidsLabel} content={cidsStr} />
			</div>
			<div className={styles.row}>
				<Entry className={styles.Commenter} label={'Commenter'} content={commenterEl} />
				{comment.MustSatisfy !== 0 && <Entry className={styles.MustSatisfy} label={'Must Satisfy'} content={mustSatisfyText} />}
			</div>

			<div className={styles.row}>
				<Entry className={styles.Page} label={'Page/Line'} content={comment.Page} />
				<Entry className={styles.Clause} label={'Clause'} content={comment.Clause} />
				<Entry className={styles.Category} label={'Category'} content={comment.Category} />
			</div>
			
			<div className={styles.row}>
				<Entry className={styles.Comment} label={'Comment'} content={comment.Comment} />
			</div>

			<div className={styles.row}>
				<Entry className={styles.ProposedChange} label={'Proposed Change'} content={comment.ProposedChange} />
			</div>

			<div className={styles.column}>
				<Resolution
					resolution={resolution}
					setResolution={setResolution}
				/>
			</div>
		</React.Fragment>
	)
}

function shallowDiff(originalObj, modifiedObj) {
	let changed = {};
	for (let k in modifiedObj) {
 		if (modifiedObj.hasOwnProperty(k) && modifiedObj[k] !== originalObj[k]) {
 			changed[k] = modifiedObj[k]
 		}
 	}
 	return changed;
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
	const {comments, commentsMap, dispatch} = props
	const history = useHistory()
	const {ballotId} = useParams()
	const query = new URLSearchParams(useLocation().search)
	const cidsStr = query.get('CIDs')
	const cids = cidsStr.split(',')

	const [resolution, setResolution] = useState()
	const origResolution = useRef()
	const [currentComments, setCurrentComments] = useState()
	const [unavailable, setUnavailable] = useState()

	useEffect(() => {
		if (ballotId && ballotId !== props.ballotId) {
			// Routed here with parameter ballotId specified, but not matching stored ballotId
			// Store the ballotId and get results for this ballotId
			dispatch(setBallotId(ballotId))
			dispatch(getComments(ballotId))
		}
	}, [])

	useEffect(() => {
		if (ballotId === props.ballotId && comments.length > 0) {
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
			setUnavailable(u.length > 0? u: null)
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
	}, [props.ballotID, props.comments, cidsStr])

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
			dispatch(updateResolutions(ballotId, updates))
		}
	}

	function findCommentIndex(cid) {
		return commentsMap.findIndex(i => {
			let c = comments[i]
			return c.CommentID.toString() === cid || `${c.CommentID}.${c.ResolutionID}` === cid
		})
	}

	function previousComment() {
		let cid = cids[0]
		var i = findCommentIndex(cid) - 1
		if (i === -2) {
			i = 0
		}
		else if (i === -1) {
			i = commentsMap.length - 1
		}
		history.replace(props.location.pathname + '?CIDs=' + comments[commentsMap[i]].CID)
	}

	function nextComment() {
		let cid = cids[0]
		var i = findCommentIndex(cid) + 1
		if (i >= commentsMap.length) {
			i = 0
		}
		history.replace(props.location.pathname + '?CIDs=' + comments[commentsMap[i]].CID)
	}

	async function handleAddResolutions() {
		let cids = currentComments.map(c => c.CommentID)
		cids = cids.filter((cid, i) => cids.indexOf(cid) === i)	// elliminate duplicates
		cids = cids.map(cid => ({CommentID: cid}))
		const resIds = await dispatch(addResolutions(ballotId, cids))
		console.log(resIds)
		if (resIds && resIds.length) {
			const cids = resIds.map(r => r.CID).join(',')
			history.replace(props.location.pathname + '?CIDs=' + cids)
		}
	}

 	async function handleDeleteResolutions() {
 		const resolutions = currentComments
 			.filter(c => c.ResolutionCount)
 			.map(c => ({CommentID: Math.floor(c.CommentID), ResolutionID: c.ResolutionID}))
 		await dispatch(deleteResolutions(ballotId, resolutions))
 		let cids = resolutions.map(r => r.CommentID)
 		cids = cids.filter((cid, i) => cids.indexOf(cid) === i)	// elliminate duplicates
 		history.replace(props.location.pathname + '?CIDs=' + cids.toString())
 	}

 	function close() {
 		history.goBack()
 	}

 	let child
 	let disableButtons = true
 	const isMultiple = currentComments && currentComments.length > 1
 	if (resolution && !unavailable) {
	 	const cids = currentComments.map(c => c.CID)
		child = (
			<Comment
				cids={cids}
				resolution={resolution}
				setResolution={doResolutionUpdate}
			/>
		)
		disableButtons = false
	}
	else {
		let emptyStr
		if (props.getComments) {
			emptyStr = 'Loading...'
		}
		else if (unavailable) {
			emptyStr = unavailable.length > 1
				? `CIDs ${unavailable.join(', ')} not available`
				: `CID ${unavailable[0]} is not avilable`
		}
		else {
			emptyStr = '!! Unexpected !!'
		}
		child = (
			<div className={styles.empty}>{emptyStr}</div>
		)
	}
 	
	return(
		<div id='CommentDetail' className={styles.root}>
			<div id='top-row' className={styles.topRow}>
				<BallotSelector readOnly />
				<span>
					<ActionButton name='prev' title='Previous Comment' disabled={disableButtons || isMultiple} onClick={previousComment} />
					<ActionButton name='next' title='Next Comment' disabled={disableButtons || isMultiple} onClick={nextComment} />
					<ActionButton name='save' title='Save Changes' disabled={disableButtons} onClick={handleSave} />
					<ActionButton name='add' title='Create Alternate Resolution' disabled={disableButtons} onClick={handleAddResolutions} />
					<ActionButton name='delete' title='Delete Resolution' disabled={disableButtons} onClick={handleDeleteResolutions} />
					<ActionButton name='close' title='Close' onClick={close} />
				</span>
			</div>
			{child}
		</div>
	)
}

function mapStateToProps(state, props) {
	const {comments} = state
	return {
		ballotId: comments.ballotId,
		comments: comments.comments,
		commentsMap: comments.commentsMap,
		getComments: comments.getComments,
  	}
}
export default connect(mapStateToProps)(CommentDetail);