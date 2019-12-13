/*
 * Comment detail
 */
import React, {useState, useEffect} from 'react'
import {useHistory, useParams} from 'react-router-dom'
import update from 'immutability-helper'
import {connect} from 'react-redux'
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs'
import {getUsers} from './actions/users'
import {updateComment, addResolution, updateResolution, deleteResolution, getComments} from './actions/comments';
import {setBallotId} from './actions/ballots';
import {ResolutionEditor} from './ResolutionEditor';
import BallotSelector from './BallotSelector';
import {IconClose} from './Icons';
import styles from './CommentDetail.css';

function shallowDiff(originalObj, modifiedObj) {
	let changed = {};
	for (let k in modifiedObj) {
 		if (modifiedObj.hasOwnProperty(k) && modifiedObj[k] !== originalObj[k]) {
 			changed[k] = modifiedObj[k]
 		}
 	}
 	return changed;
}

function CommentDetail(props) {
	const [comment, setComment] = useState(null)
	const history = useHistory()
	let {ballotId, commentId} = useParams()
	commentId = parseInt(commentId)	// comes in as a string, but we want a number

	useEffect(() => {
		if (!props.usersDataValid) {
			props.dispatch(getUsers())
		}
		if (ballotId && ballotId !== props.ballotId) {
			// Routed here with parameter ballotId specified, but not matching stored ballotId
			// Store the ballotId and get results for this ballotId
			props.dispatch(setBallotId(ballotId))
			props.dispatch(getComments(ballotId))
		}
	}, [])

	useEffect(() => {
		console.log('render ', comment, props.commentData)
		if (!comment) {
			const newComment = props.commentData.find(c => c.CommentID === commentId)
			if (newComment !== undefined) {
				console.log('set comment')
				setComment(newComment)
			}
		}
	})

	useEffect(() => {
		if ((props.ballotId && ballotId !== props.ballotId) || 
		    (comment && comment.CommentID !== commentId)) {
			history.replace(`/Comments/${props.ballotId}/${comment.CommentID}`)
		}
	}, [props.ballotId, comment])

	function previousComment() {
		const commentId = comment.CommentID
		var i = props.commentDataMap.findIndex(i => props.commentData[i].CommentID === commentId) - 1
		if (i === -2) {
			i = 0
		}
		else if (i === -1) {
			i = props.commentDataMap.length - 1
		}
		const newComment = props.commentData[props.commentDataMap[i]]
		setComment(newComment);
		//history.replace(`/Comments/${props.ballotId}/${newComment.CommentID}`)
	}

	function nextComment() {
		const commentId = comment.CommentID
		var i = props.commentDataMap.findIndex(i => props.commentData[i].CommentID === commentId) + 1
		if (i >= props.commentDataMap.length) {
			i = 0
		}
		const newComment = props.commentData[props.commentDataMap[i]]
		setComment(newComment);
		//history.replace(`/Comments/${props.ballotId}/${newComment.CommentID}`)
	}

 	function close() {
 		history.goBack()
 	}

 	function handleAddResolution(e) {
 		setComment(update(comment, {resolutions: {$push: [{ResolutionID: comment.resolutions.length}]}}))
 	}

 	function handleRemoveResolution(index) {
 		setComment(update(comment, {resolutions: {$splice: [[index, 1]]}}))
 	}
 	
 	function changeCheckboxGroup(e) {
 		setComment(update(comment, {[e.target.name]: {$set: e.target.checked? e.target.value: ''}}))
 	}

 	function changeInput(e) {
 		setComment(update(comment, {[e.target.name]: {$set: e.target.value}}))
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

 	function changeResolutionInput(e, index) {
 		setComment(update(comment, {resolutions: {[index]: {[e.target.name]: {$set: e.target.value}}}}))
 	}
	function changeResolutionCheckboxGroup(e, index) {
 		setComment(update(comment, {resolutions: {[index]: {[e.target.name]: {$set: e.target.checked? e.target.value: ''}}}}))
 	}
 	function changeResolutionDiv(e, index) {
		setComment(update(comment, {resolutions: {[index]: {Resolution: {$set: e.target.innerHTML}}}}))
	}
 	
 	function Comment(props) {
 		return (
 			<React.Fragment>
	 			<div className={styles.row}>
					<button onClick={close}>Close</button>
					<button onClick={previousComment}>Prev</button>
					<button onClick={nextComment}>Next</button>
					<button onClick={saveChange}>Save</button>
					<button onClick={undoChange}>Undo</button>
				</div>

				<div className={styles.row}>
					<div className={styles.CID}><label>CID:</label><span>{comment.CommentID}</span></div>
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

				<div className={styles.tab}>
					<ResolutionTabs />
				</div>

				<div className={styles.tab}>
					<OtherTabs />
				</div>
			</React.Fragment>
		)
 	}

 	function Resolution({index}) {
 		const r = comment.resolutions[index]
 		return (
 			<React.Fragment>
	 			<div className={styles.row}>
					<div className={styles.Assignee}><label>Assignee:</label><span>{r.Assginee}</span></div>
					<select
						name='AssigneeName'
						value={r.Assignee === null? 0: r.Assignee}
						onChange={e => changeResolutionInput(e, index)}
					>
						<option key={0} value={0}>Not Assigned</option>
						{props.usersData && props.usersData.map(i => {
							return (<option key={i.UserID} value={i.UserID}>{i.Name} &lt;{i.Email}&gt;</option>)
							})}
					</select>
					<label>Ready for motion:
						<input
							type='checkbox'
							name='ReadyForMotion'
							checked={r.ReadyForMotion}
							onChange={e => changeResolutionInput(e, index)}
						/>
					</label>
					<label>Approved by motion:
						<input
							className={styles.ApprovedByMotion}
							type='text'
							name='ApprovedByMotion'
							value={r.ApprovedByMotion}
							onChange={e => changeResolutionInput(e, index)}
						/>
					</label>
				</div>	
	 			<div className={styles.row}>
					<div className={styles.ResolutionStatus}>
						<label>
							<input
								type='checkbox'
								name='ResnStatus'
								value='A'
								checked={r.ResnStatus === 'A'}
								onChange={e => changeResolutionCheckboxGroup(e, index)}
							/>Accepted
						</label>
						<label>
							<input
								type='checkbox'
								name='ResnStatus'
								value='V'
								checked={r.ResnStatus === 'V'}
								onChange={e => changeResolutionCheckboxGroup(e, index)}
							/>Revised
						</label>
						<label>
							<input
								type='checkbox'
								name='ResnStatus'
								value='J'
								checked={r.ResnStatus === 'J'}
								onChange={e => changeResolutionCheckboxGroup(e, index)}
							/>Rejected
						</label>
					</div>
					<div className={styles.Submission}>
						<label>Submission:
							<input
								className={styles.SubmissionInput}
								type='text'
								name='Submission'
								value={r.Submission === null? '': r.Submission}
								onChange={e => changeResolutionInput(e, index)}
							/>
						</label>
					</div>
				</div>
				<div className={styles.Resolution}>
					<ResolutionEditor
						className={styles.ResolutionInput}
						name='Resolution'
						value={r.Resolution}
						onChange={e => changeResolutionInput(e, index)}
					/>
				</div>
			</React.Fragment>
		)
 	}

	function Editing(props) {
		return (
			<React.Fragment>
				<div className={styles.TopRow}>
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
						/><br />
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
 		return (
			<div
				className={styles.Notes}
				contentEditable
				onInput={e => setComment(update(comment, {Notes: {$set: e.target.innerHTML}}))}
			/>
 		)
 	}

	function History(props) {
		return (
			<div
				className={styles.History}
				contentEditable
				onInput={e => setComment(update(comment, {History: {$set: e.target.innerHTML}}))}
			/>
		)
	}

	function ResolutionTabs(props) {
		return (
			<Tabs
				className={styles.cTabs}
				selectedTabClassName={styles.cTabs_Tab__selected}
				disabledTabClassName={styles.cTabs_Tab__disabled}
				selectedTabPanelClassName={styles.cTabs_TabPanel__selected}
			>
				<TabList className={styles.cTabs_TabList}>
					{comment.resolutions.map((r, index) =>
						(
							<Tab key={index} className={styles.cTabs_Tab}>
								{index === 0? 'Resolution ': ''}{index}&nbsp;
								<IconClose onClick={() => handleRemoveResolution(index)} />
							</Tab>
						)
					)}
					<Tab className={styles.cTabs_Tab} onClick={handleAddResolution}>+</Tab>
				</TabList>
				{comment.resolutions.map((r, index) => 
					(
						<TabPanel key={index} className={styles.cTabs_TabPanel}>
							<Resolution index={index} />
						</TabPanel>
					)
				)}
				<TabPanel className={styles.cTabs_TabPanel} />
			</Tabs>
		)
	}

	function OtherTabs(props) {
		return (
			<Tabs
				className={styles.cTabs}
				selectedTabClassName={styles.cTabs_Tab__selected}
				disabledTabClassName={styles.cTabs_Tab__disabled}
				selectedTabPanelClassName={styles.cTabs_TabPanel__selected}
			>
				<TabList className={styles.cTabs_TabList}>
					<Tab className={styles.cTabs_Tab}>Editing</Tab>
					<Tab className={styles.cTabs_Tab}>Notes</Tab>
					<Tab className={styles.cTabs_Tab}>History</Tab>
				</TabList>
				<TabPanel className={styles.cTabs_TabPanel}>
					<Editing />
				</TabPanel>
				<TabPanel className={styles.cTabs_TabPanel}>
					<Notes />
				</TabPanel>
				<TabPanel className={styles.cTabs_TabPanel}>
					<History />
				</TabPanel>
			</Tabs>
		)
	}

	return(
		<div id='CommentDetail' className={styles.root}>
			<div className={styles.row}>
				<BallotSelector readOnly />
			</div>
			{comment?
				<Comment />
				:
				<div className={styles.empty}>
					{props.getComments? 'Loading...': `CID ${commentId} not available`}
				</div>
			}
		</div>
	)
}

function mapStateToProps(state) {
	const {comments, users} = state
	return {
		ballotId: comments.ballotId,
		commentData: comments.commentData,
		commentDataMap: comments.commentDataMap,
		getComments: comments.getComments,
		usersDataValid: users.usersDataValid,
		usersData: users.usersData
  	}
}
export default connect(mapStateToProps)(CommentDetail);