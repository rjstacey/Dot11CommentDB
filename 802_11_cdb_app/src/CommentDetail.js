/*
 * Comment detail
 */
import React, {useState, useEffect} from 'react'
import {useHistory, useParams, useLocation} from 'react-router-dom'
import update from 'immutability-helper'
import {connect} from 'react-redux'
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs'
import ConfirmModal from './ConfirmModal'
import {updateComment, addResolution, updateResolution, deleteResolution, getComments} from './actions/comments'
import {setBallotId} from './actions/ballots'
import {ResolutionEditor} from './ResolutionEditor'
import BallotSelector from './BallotSelector'
import AssigneeSelector from './AssigneeSelector'
import {ActionButton, IconClose} from './Icons'
import styles from './CommentDetail.css'


function Resolution(props) {
	const {resolution, setResolution} = props
	console.log(resolution)

	function changeResolutionInput(e) {
 		setResolution(update(resolution, {[e.target.name]: {$set: e.target.value}}))
 	}

 	function changeResnStatus(value) {
 		setResolution(update(resolution, {ResnStatus: {$set: value}}))
 	}

 	function changeResolution(value) {
 		setResolution(update(resolution, {Resolution: {$set: value}}))
 	}

 	function changeAssignee(value) {
 		setResolution(update(resolution, {AssigneeSAPIN: {$set: value}}))
 	}
	
 	function changeApproved(e) {
 		let value;
 		if (e.target.checked) {
 			value = new Date()
 			value = value.toDateString()
 		}
 		else {
 			value = '';
 		}
 		setResolution(update(resolution, {ApprovedByMotion: {$set: value}}))
 	}

	return (
		<React.Fragment>
			<div className={styles.row} style={{justifyContent: 'space-between'}}>
				<div className={styles.column}>
					<span style={{display: 'inline-flex'}}>
						<label style={{width: 120}}>Assignee:</label>
						<AssigneeSelector
							value={resolution.AssigneeSAPIN}
							onChange={changeAssignee}
						/>
					</span>
					<span style={{display: 'inline-flex'}}>
						<label style={{width: 120}}>Submission:</label>
						<input
							className={styles.SubmissionInput}
							type='text'
							name='Submission'
							value={resolution.Submission === null? '': resolution.Submission}
							onChange={e => changeResolutionInput(e)}
						/>
					</span>
				</div>
				<div className={styles.column} >
					<label>
						<input
							type='checkbox'
							name='ReadyForMotion'
							checked={resolution.ReadyForMotion}
							onChange={e => changeResolutionInput(e)}
						/>
						Ready for motion
					</label>
					<label>
						<input
							type='checkbox'
							name='Approved'
							checked={!!resolution.ApprovedByMotion}
							onChange={e => changeApproved(e)}
						/>
						Approved
						<input
							className={styles.ApprovedByMotion}
							type='text'
							name='ApprovedByMotion'
							value={resolution.ApprovedByMotion || ''}
							onChange={e => changeResolutionInput(e)}
						/>
					</label>
				</div>
			</div>
			<div className={styles.Resolution}>
				<ResolutionEditor
					className={styles.ResolutionInput}
					name='Resolution'
					resnStatus={resolution.ResnStatus}
					changeResnStatus={(value) => changeResnStatus(value)}
					resolution={resolution.Resolution}
					changeResolution={(value) => changeResolution(value)}
				/>
			</div>
		</React.Fragment>
	)
}

function Resolutions(props) {
	const {resolutions, setResolutions} = props
	const [tabIndex, setTabIndex] = useState(0)

	function handleAddResolution(e) {
		const index = resolutions.length
 		setResolutions(update(resolutions, {$push: [{ResolutionID: index}]}))
 		setTabIndex(index)
 		console.log(`add resolution ${index}`)
 	}

	async function handleRemoveResolution(e, index) {
		const ok = await ConfirmModal.show(`Are you sure you want to delete resolution ${index}?`)
		if (ok) {
			setResolutions(update(resolutions, {$splice: [[index, 1]]}))
			e.preventDefault()
			if (tabIndex === index) {
				setTabIndex(0)
			}
		}
	}
	
	return (
		<Tabs
			className={styles.tabs}
			selectedTabClassName={styles.tab_selected}
			disabledTabClassName={styles.tab_disabled}
			selectedTabPanelClassName={styles.tabPanel_selected}
			selectedIndex={tabIndex}
			onSelect={setTabIndex}
		>
			<TabList className={styles.tabList}>
				{resolutions.map((r, index) =>
					<Tab key={index} className={styles.tab}>
						Resolution {index}&nbsp;
						<IconClose onClick={(e) => handleRemoveResolution(e, index)} />
					</Tab>
				)}
				<Tab className={styles.tab} onClick={handleAddResolution}>+</Tab>
			</TabList>
			{resolutions.map((r, index) => 
				<TabPanel key={index} className={styles.tabPanel}>
					<Resolution
						index={index}
						resolution={resolutions[index]}
						setResolution={(r) => setResolutions(update(resolutions, {[index]: {$set: r}}))}
					/>
				</TabPanel>
			)}
			<TabPanel className={styles.tabPanel}>
				<div className={styles.AddResolution} onClick={handleAddResolution}>Add resolution...</div>
			</TabPanel>
		</Tabs>
	)
}

function Editing(props) {
	const {comment, setComment} = props

	function changeCheckboxGroup(e) {
 		setComment(update(comment, {[e.target.name]: {$set: e.target.checked? e.target.value: ''}}))
 	}

 	function changeInput(e) {
 		setComment(update(comment, {[e.target.name]: {$set: e.target.value}}))
 	}

	return (
		<React.Fragment>
			<div className={styles.row}>
				<div className={styles.EditingStatus}>
					<label>
						<input
							type='checkbox'
							name='EditStatus'
							value='I'
							checked={comment.EditStatus === 'I'}
							onChange={changeCheckboxGroup}
						/>Implemented</label>
					<label>
						<input
							type='checkbox'
							name='EditStatus'
							value='N'
							checked={comment.EditStatus === 'N'}
							onChange={changeCheckboxGroup}
						/>No Change
					</label>
				</div>
				<label>Edited in Draft:
					<input
						className={styles.EditedInDraft}
						type='text'
						name='EditInDraft'
						value={comment.EditInDraft}
						onChange={changeInput}
					/>
				</label>
			</div>
			<div
				className={styles.EditingNotes}
				contentEditable
				onInput={e => setComment(update(comment, {EditNotes: {$set: e.target.innerHTML}}))}
			/>
		</React.Fragment>
	)
}

function Notes(props) {
	const {comment, setComment} = props

	return (
		<div
			className={styles.Notes}
			contentEditable
			onInput={e => setComment(update(comment, {Notes: {$set: e.target.innerHTML}}))}
		/>
	)
}

function History(props) {
	const {comment, setComment} = props

	return (
		<div
			className={styles.History}
			contentEditable
			onInput={e => setComment(update(comment, {History: {$set: e.target.innerHTML}}))}
		/>
	)
}

function OtherTabs(props) {
	const {comment, setComment} = props

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
				<Tab className={styles.tab}>History</Tab>
			</TabList>
			<TabPanel className={styles.tabPanel}>
				<Editing
					comment={comment}
					setComment={setComment}
				/>
			</TabPanel>
			<TabPanel className={styles.tabPanel}>
				<Notes
					comment={comment}
					setComment={setComment}
				/>
			</TabPanel>
			<TabPanel className={styles.tabPanel}>
				<History
					comment={comment}
					setComment={setComment}
				/>
			</TabPanel>
		</Tabs>
	)
}

function Comment(props) {
	const {comment, setComment} = props

	 function setResolutions(resolutions) {
 		setComment(update(comment, {resolutions: {$set: resolutions}}))
 	}

	return (
		<React.Fragment>
			<div className={styles.row}>
				<div className={styles.CID}>
					<label>CID:</label><span>{comment.CommentID.toFixed(comment.ResolutionCount > 1? 1: 0)}</span>
				</div>
				<div className={styles.Commenter}><label>Commenter:</label><span>{comment.CommenterName}</span></div>
				<div className={styles.MustSatisfy}><label>Must Satisfy:</label><input type='checkbox' readOnly checked={comment.MustSatisfy} /></div>
			</div>

			<div className={styles.row}>
				<div className={styles.Page}><label>Page/Line:</label><span>{comment.Page}</span></div>
				<div className={styles.Clause}><label>Clause:</label><span>{comment.Clause}</span></div>
				<div className={styles.Category}><label>Category:</label><span>{comment.Category}</span></div>
			</div>
			
			<div className={styles.row}>
				<div className={styles.column}>
					<label>Comment:</label>
					<div className={styles.Comment}>{comment.Comment}</div>
				</div>
			</div>
			<div className={styles.row}>
				<div className={styles.column}>
					<label>Proposed Change:</label>
					<div className={styles.ProposedChange}>{comment.ProposedChange}</div>
				</div>
			</div>

			<div className={styles.row}>
				<div className={styles.column}>
					<div className={styles.row} style={{justifyContent: 'space-between'}}>
						<label>Resolution:</label>
						<ActionButton name='add' title='Create Alternate Resolution' />
					</div>
					<Resolution
						resolution={comment}
						setResolution={setComment}
					/>
				</div>
			</div>

			<div className={styles.tab}>
				<OtherTabs
					comment={comment}
					setComment={setComment}
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

function useQuery() {
	return new URLSearchParams(useLocation().search);
}

function CommentDetail(props) {
	const {commentData, commentDataMap, dispatch} = props
	const history = useHistory()
	const {ballotId} = useParams()
	const query = useQuery()
	const commentId = parseFloat(query.get('CID'), 10)	// comes in as a string, but we want a number
	const [comment, setComment] = useState(null)

	useEffect(() => {
		if (ballotId && ballotId !== props.ballotId) {
			// Routed here with parameter ballotId specified, but not matching stored ballotId
			// Store the ballotId and get results for this ballotId
			dispatch(setBallotId(ballotId))
			dispatch(getComments(ballotId))
		}
	}, [])

	useEffect(() => {
		if (ballotId === props.ballotId && !comment) {
			const c = commentData.find(c => c.CommentID === commentId)
			if (c) {
				setComment(c)
			}
		}
	}, [props.commentData])

	function previousComment() {
		const commentId = comment.CommentID
		var i = commentDataMap.findIndex(i => commentData[i].CommentID === commentId) - 1
		if (i === -2) {
			i = 0
		}
		else if (i === -1) {
			i = commentDataMap.length - 1
		}
		const c = commentData[commentDataMap[i]]
		const {CommentID, ResolutionCount} = c
		setComment(c)
		history.replace(props.location.pathname + `?CID=${CommentID.toFixed(ResolutionCount > 1? 1: 0)}`)
	}

	function nextComment() {
		const commentId = comment.CommentID
		var i = commentDataMap.findIndex(i => commentData[i].CommentID === commentId) + 1
		if (i >= commentDataMap.length) {
			i = 0
		}
		const c = commentData[commentDataMap[i]]
		const {CommentID, ResolutionCount} = c
		setComment(c)
		console.log(CommentID, ResolutionCount)
		history.replace(props.location.pathname + `?CID=${CommentID.toFixed(ResolutionCount > 1? 1: 0)}`)
	}

 	function close() {
 		history.goBack()
 	}
 	
 	function saveChange(e) {
 		const commentId = comment.CommentID
 		const propsComment = props.commentData.find(c => c.CommentID === commentId)
 		const stateComment = comment
 		var changed = shallowDiff(propsComment, stateComment);

 		if (changed.resolutions) {
 			changed.resolutions.forEach(r1 => {
 				let onlyInModified = true
 				propsComment.resolutions.forEach(r2 => {
 					if (r1.ResolutionID === r2.ResolutionID) {
 						onlyInModified = false
 						let m = shallowDiff(r2, r1)
 						if (Object.keys(m).length) {
 							m.BallotID = props.ballotId
 							m.CommentID = comment.CommentID
 							m.ResolutionID = r1.ResolutionID
 							props.dispatch(updateResolution(m))
 						}
 					}
 				})
 				if (onlyInModified) {
 					r1.BallotID = props.ballotId
 					r1.CommentID = comment.CommentID
 					props.dispatch(addResolution(r1))
 				}
 			})
 			propsComment.resolutions.forEach(r2 => {
 				let onlyInOriginal = true
 				changed.resolutions.forEach(r1 => {
 					if (r1.ResolutionID === r2.ResolutionID) {
 						onlyInOriginal = false
 					}
 				})
 				if (onlyInOriginal) {
 					let r = {
 						BallotID: props.ballotId,
 						CommentID: comment.CommentID,
 						ResolutionID: r2.ResolutionID
 					}
 					props.dispatch(deleteResolution(r))
 				}
 			})
 			delete changed.resolutions
 		}
 		if (Object.keys(changed).length) {
 			changed.BallotID = props.ballotId
 			changed.CommentID = comment.CommentID
 			props.dispatch(updateComment(changed))
 		}
 	}

 	function undoChange(e) {
 		setComment(props.commentData.find(c => c.CommentID === commentId))
 	}

	return(
		<div id='CommentDetail' className={styles.root}>
			<div id='top-row' className={styles.topRow}>
				<BallotSelector readOnly />
				<span>
	 				<ActionButton name='prev' title='Previous Comment' onClick={previousComment} />
					<ActionButton name='next' title='Next Comment' onClick={nextComment} />
					<ActionButton name='save' title='Save' onClick={saveChange} />
					<ActionButton name='undo' title='Undo' onClick={undoChange} />
					<ActionButton name='close' title='Close' onClick={close} />
				</span>
			</div>
			{comment?
				<Comment
					comment={comment}
					setComment={setComment}
				/>
				:
				<div className={styles.empty}>
					{props.getComments? 'Loading...': `CID ${commentId} not available`}
				</div>
			}
		</div>
	)
}

function mapStateToProps(state) {
	const {comments} = state
	return {
		ballotId: comments.ballotId,
		commentData: comments.commentData,
		commentDataMap: comments.commentDataMap,
		getComments: comments.getComments,
  	}
}
export default connect(mapStateToProps)(CommentDetail);