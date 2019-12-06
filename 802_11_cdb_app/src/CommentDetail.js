/*
 * Comment detail
 */
import React from 'react'
import update from 'immutability-helper'
import {connect} from 'react-redux'
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs'
import {getUsers} from './actions/users'
import {updateComment, addResolution, updateResolution, deleteResolution} from './actions/comments';
import {ResolutionEditor} from './ResolutionEditor';
import './CommentDetail.css'

function shallowDiff(originalObj, modifiedObj) {
	let changed = {};
	for (let k in modifiedObj) {
 		if (modifiedObj.hasOwnProperty(k) && modifiedObj[k] !== originalObj[k]) {
 			changed[k] = modifiedObj[k]
 		}
 	}
 	return changed;
}


class CommentDetail extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			index: props.commentIndex,
			comment: props.commentData[props.commentDataMap[props.commentIndex]]
		}
	}

	componentDidMount() {
		if (!this.props.usersDataValid) {
			this.props.dispatch(getUsers())
		}
	}

 	previousComment = () => {
		const index = this.state.index - 1;
 		if (index >= 0) {
 			const comment = this.props.commentData[this.props.commentDataMap[index]];
 			this.setState({index, comment});
 		}
 	}
 	nextComment = () => {
		const index = this.state.index + 1;
 		if (index < this.props.commentDataMap.length) {
 			const comment = this.props.commentData[this.props.commentDataMap[index]];
 			this.setState({index, comment});
 		}
 	}

 	addResolution = (e) => {
 		this.setState({comment: update(this.state.comment, {resolutions: {$push: [{ResolutionID: this.state.comment.resolutions.length}]}})})
 	}
 	removeResolution = (index) => {
 		this.setState({comment: update(this.state.comment, {resolutions: {$splice: [[index, 1]]}})})
 	}
 	
 	changeCheckboxGroup = (e) => {
 		this.setState({comment: update(this.state.comment, {[e.target.name]: {$set: e.target.checked? e.target.value: ''}})})
 	}
 	changeInput = (e) => {
 		this.setState({comment: update(this.state.comment, {[e.target.name]: {$set: e.target.value}})})
 	}

 	saveChange = (e) => {
 		const propComment = this.props.commentData[this.props.commentDataMap[this.props.commentIndex]]
 		const stateComment = this.state.comment
 		var changed = shallowDiff(propComment, stateComment);

 		if (changed.resolutions) {
 			changed.resolutions.forEach(r1 => {
 				let onlyInModified = true
 				propComment.resolutions.forEach(r2 => {
 					if (r1.ResolutionID === r2.ResolutionID) {
 						onlyInModified = false
 						let m = shallowDiff(r2, r1)
 						if (Object.keys(m).length) {
 							m.BallotID = this.props.ballotId
 							m.CommentID = this.state.comment.CommentID
 							m.ResolutionID = r1.ResolutionID
 							this.props.dispatch(updateResolution(m))
 						}
 					}
 				})
 				if (onlyInModified) {
 					r1.BallotID = this.props.ballotId
 					r1.CommentID = this.state.comment.CommentID
 					this.props.dispatch(addResolution(r1))
 				}
 			})
 			propComment.resolutions.forEach(r2 => {
 				let onlyInOriginal = true
 				changed.resolutions.forEach(r1 => {
 					if (r1.ResolutionID === r2.ResolutionID) {
 						onlyInOriginal = false
 					}
 				})
 				if (onlyInOriginal) {
 					let r = {
 						BallotID: this.props.ballotId,
 						CommentID: this.state.comment.CommentID,
 						ResolutionID: r2.ResolutionID
 					}
 					this.props.dispatch(deleteResolution(r))
 				}
 			})
 			delete changed.resolutions
 		}
 		if (Object.keys(changed).length) {
 			changed.BallotID = this.props.ballotId
 			changed.CommentID = this.state.comment.CommentID
 			this.props.dispatch(updateComment(changed))
 		}
 	}

 	undoChange = (e) => {
 		this.setState({comment: this.props.commentData[this.props.commentDataMap[this.props.commentIndex]]})
 	}

 	changeResolutionInput = (e, index) => {
 		this.setState({comment: update(this.state.comment, {resolutions: {[index]: {[e.target.name]: {$set: e.target.value}}}})})
 	}
	changeResolutionCheckboxGroup = (e, index) => {
 		this.setState({comment: update(this.state.comment, {resolutions: {[index]: {[e.target.name]: {$set: e.target.checked? e.target.value: ''}}}})})
 	}
 	changeResolutionDiv = (e, index) => {
		this.setState({comment: update(this.state.comment, {resolutions: {[index]: {Resolution: {$set: e.target.innerHTML}}}})})
	}
 	renderResolutionTabPanel = (index) => {
 		var r = this.state.comment.resolutions[index]
 		return (
 			<TabPanel key={index} className="cTabs_TabPanel">
 			<div className='row'>
				<div className='Assignee'><label>Assignee:</label><span>{r.Assginee}</span></div>
				<select
					name='AssigneeName'
					value={r.Assignee === null? 0: r.Assignee}
					onChange={e => this.changeResolutionInput(e, index)}
				>
					<option key={0} value={0}>Not Assigned</option>
					{this.props.usersData && this.props.usersData.map(i => {
						return (<option key={i.UserID} value={i.UserID}>{i.Name} &lt;{i.Email}&gt;</option>)
						})}
				</select>
				<span className="fa fa-trash-alt" onClick={() => this.removeResolution(index)}/>
			</div>	
 			<div className='TopRow'>
				<div className='ResolutionStatus'>
					<label>
						<input
							type='checkbox'
							name='ResnStatus'
							value='A'
							checked={r.ResnStatus === 'A'}
							onChange={e => this.changeResolutionCheckboxGroup(e, index)}
						/>Accepted
					</label>
					<label>
						<input
							type='checkbox'
							name='ResnStatus'
							value='V'
							checked={r.ResnStatus === 'V'}
							onChange={e => this.changeResolutionCheckboxGroup(e, index)}
						/>Revised
					</label>
					<label>
						<input
							type='checkbox'
							name='ResnStatus'
							value='J'
							checked={r.ResnStatus === 'J'}
							onChange={e => this.changeResolutionCheckboxGroup(e, index)}
						/>Rejected
					</label>
				</div>
				<div className='Submission'>
					<label>Submission:
						<input
							className='SubmissionInput'
							type='text'
							name='Submission'
							value={r.Submission === null? '': r.Submission}
							onChange={e => this.changeResolutionInput(e, index)}
						/>
					</label>
				</div>
			</div>
			<div className='Resolution'>
				<ResolutionEditor
					className='ResolutionInput'
					name='Resolution'
					value={r.Resolution}
					onChange={e => this.changeResolutionInput(e, index)}
				/>
			</div>
			<div className='row'>
				<label>Ready for motion:
					<input
						type='checkbox'
						name='ReadyForMotion'
						checked={r.ReadyForMotion}
						onChange={e => this.changeResolutionInput(e, index)}
					/>
				</label>
				<label>Approved by motion:
					<input
						className='ApprovedByMotion'
						type='text'
						name='ApprovedByMotion'
						value={r.ApprovedByMotion}
						onChange={e => this.changeResolutionInput(e, index)}
					/>
				</label><br />
			</div>
			</TabPanel>
		)
 	}

	renderAddResolutionTabPanel = () => {
		return (
			<TabPanel className="cTabs_TabPanel" />
			)
	}

	renderEditingTabPanel = () => {
		return (
	 		<TabPanel className="cTabs_TabPanel">
	          	<div className='TopRow'>
	          		<div className='EditingStatus'>
			  			<label>
							<input
								type='checkbox'
								name='EditStatus'
								value='I'
								checked={this.state.comment.EditStatus === 'I'}
								onChange={this.changeCheckboxGroup}
							/>Implemented</label>
						<label>
							<input
								type='checkbox'
								name='EditStatus'
								value='N'
								checked={this.state.comment.EditStatus === 'N'}
								onChange={this.changeCheckboxGroup}
							/>No Change
						</label>
					</div>
					<label>Edited in Draft:
						<input
							className='EditedInDraft'
							type='text'
							name='EditInDraft'
							value={this.state.comment.EditInDraft}
							onChange={this.changeInput}
						/><br />
					</label>
				</div>
				<div
					className='EditingNotes'
					contentEditable
					onInput={e => {
						this.setState({
							comment: update(this.state.comment, {EditNotes: {$set: e.target.innerHTML}})
						});
					}}
					//dangerouslySetInnerHTML={{__html: this.state.comment.EditingNotes}}
				/>
			</TabPanel>
		)
 	}

 	renderNotesTabPanel = () => {
 		return (
 			<TabPanel className="cTabs_TabPanel">
				<div
					className='Notes'
					contentEditable
					onInput={e => {
						this.setState({
							comment: update(this.state.comment, {Notes: {$set: e.target.innerHTML}})
						});
					}}
					//dangerouslySetInnerHTML={{__html: this.state.comment.Notes}}
				/>
			</TabPanel>
 		)
 	}

	renderHistoryTabPanel = () => {
		return (
			<TabPanel className="cTabs_TabPanel">
				<div
					className='History'
					contentEditable
					onInput={e => {
						this.setState({
							comment: update(this.state.comment, {History: {$set: e.target.innerHTML}})
						});
					}}
					//dangerouslySetInnerHTML={{__html: this.state.comment.History}}
				/>
  			</TabPanel>
		)
	}
	renderTabs = () => {
		return (
		<Tabs
			className="cTabs"
			selectedTabClassName="cTabs_Tab--selected"
			disabledTabClassName="cTabs_Tab--disabled"
			selectedTabPanelClassName="cTabs_TabPanel--selected"
		>
			<TabList className="cTabs_TabList">
				{this.state.comment.resolutions.map((r, index) =>
					(	<Tab key={index} className="cTabs_Tab">
							{index === 0? 'Resolution ': ''}{index}
							
						</Tab>)
				)}
				<Tab className="cTabs_Tab" onClick={this.addResolution}>+</Tab>
				<Tab className="cTabs_Tab">Editing</Tab>
				<Tab className="cTabs_Tab">Notes</Tab>
				<Tab className="cTabs_Tab">History</Tab>
			</TabList>

			{this.state.comment.resolutions.map((r, index) => this.renderResolutionTabPanel(index))}

			{this.renderAddResolutionTabPanel()}

			{this.renderEditingTabPanel()}

			{this.renderNotesTabPanel()}

			{this.renderHistoryTabPanel()}
		</Tabs>
		)
	}

 	render() {
 		const {comment} = this.state

		return(
			<div id='CommentDetail'>
				<div className='row'>
					<button onClick={this.props.close}>Back</button>
					<button onClick={this.previousComment}>Prev</button>
					<button onClick={this.nextComment}>Next</button>
					<button onClick={this.saveChange}>Save</button>
					<button onClick={this.undoChange}>Undo</button>
				</div>

				<div className='row'>
					<div className='CID'><label>CID:</label><span>{comment.CommentID}</span></div>
					<div className='Commenter'><label>Commenter:</label><span>{comment.CommenterName}</span></div>
					<div className='MustSatisfy'><label>Must Satisfy:</label><input type='checkbox' readOnly checked={comment.MustSatisfy} /></div>
				</div>

				<div className='row'>
					<div className='Page'><label>Page/Line:</label><span>{comment.Page}</span></div>
					<div className='Clause'><label>Clause:</label><span>{comment.Clause}</span></div>
					<div className='Category'><label>Category:</label><span>{comment.Category}</span></div>
				</div>
				

				<div className='row'>
					<div className='column'>
						<div className='column'>
							<label>Comment:</label>
							<div className='Comment'>{comment.Comment}</div>
							<label>Proposed Change:</label>
							<div className='ProposedChange'>{comment.ProposedChange}</div>
						</div>
					</div>

				</div>
				<div className='row'>
					<div className='column'>
						{this.renderTabs()}
					</div>
				</div>
			</div>
		)
	}
}

function mapStateToProps(state) {
	const {comments, users} = state
	return {
		ballotId: comments.ballotId,
		commentData: comments.commentData,
		usersDataValid: users.usersDataValid,
		usersData: users.usersData
  	}
}
export default connect(mapStateToProps)(CommentDetail);