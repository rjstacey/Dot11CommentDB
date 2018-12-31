/*
 * Comment detail
 */
import React from 'react';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import {fetchUsers} from './actions/users';
import './CommentDetail.css'

class CommentDetail extends React.Component {
 	constructor(props) {
 		super(props)

 		console.log(props.commentDataMap, props.commentIndex)
 		this.state = {
 			index: props.commentIndex,
 			comment: props.commentData[props.commentDataMap[props.commentIndex]]
 		}
 		console.log(this.state.commentData)
 		this.state.comment.ResnStatus = ''
 		this.state.comment.EditStatus = ''
 		this.state.comment.ReadyForMotion = false
 		this.state.comment.ApprovedByMotion = ''
 		this.state.comment.EditedInDraft = ''
 		this.state.comment.Submission = ''
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

 	
 	changeCheckboxGroup = (e) => {
 		this.setState({comment: update(this.state.comment, {[e.target.name]: {$set: e.target.checked? e.target.value: ''}})})
 	}
 	changeInput = (e) => {
 		this.setState({comment: update(this.state.comment, {[e.target.name]: {$set: e.target.value}})})
 	}
 	componentDidMount() {
 		this.props.dispatch(fetchUsers())
 	}
 	render() {

 		//console.log(this.state.comment)

    	return(
	        <div id='CommentDetail'>
				<div className='row'>
					<button onClick={this.props.close}>Back</button>
					<button onClick={this.previousComment}>Prev</button>
					<button onClick={this.nextComment}>Next</button>
					<button onClick={this.saveChange}>Save</button>
					<button onClick={this.UndoChange}>Undo</button>
				</div>

				<div className='row'>
					<div className='CID'><label>CID:</label><span>{this.state.comment.CommentID}</span></div>
					<div className='Commenter'><label>Commenter:</label><span>{this.state.comment.Commenter}</span></div>
					<div className='MustSatisfy'><label>Must Satisfy:</label><input type='checkbox' readOnly checked={this.state.comment.MustSatisfy} /></div>
				</div>

				<div className='row'>
					<div className='Page'><label>Page/Line:</label><span>{this.state.comment.Page}</span></div>
					<div className='Clause'><label>Clause:</label><span>{this.state.comment.Clause}</span></div>
					<div className='Category'><label>Category:</label><span>{this.state.comment.Category}</span></div>
				</div>
				<div className='row'>
					<div className='Assignee'><label>Assignee:</label><span>{this.state.comment.Assginee}</span></div>
					<select
						name='Assignee'
						value={this.state.comment.Assignee}
						onChange={this.assigneeChange}
					>
						<option key={0} value={0}>Not Assigned</option>
						{this.props.userData && this.props.userData.map(i => {
							return (<option key={i.UserID} value={i.UserID}>{i.Name} &lt;{i.Email}&gt;</option>)
							})}
					</select>
					<label>Ready for motion:
						<input
							type='checkbox'
							name='ReadyForMotion'
							checked={this.state.comment.ReadyForMotion}
							onChange={e => {this.setState({comment: update(this.state.comment, {[e.target.name]: {$set: e.target.checked}})})}}
						/>
					</label>
					<label>Approved by motion:
						<input
							className='ApprovedByMotion'
							type='text'
							name='ApprovedByMotion'
							value={this.state.comment.ApprovedByMotion}
							onChange={this.changeInput}
						/>
			  		</label><br />
				</div>

				<div className='row'>
					<div className='column'>
						<div className='column'>
							<label>Comment:</label>
							<div className='Comment'>{this.state.comment.Comment}</div>
							<label>Proposed Change:</label>
							<div className='ProposedChange'>{this.state.comment.ProposedChange}</div>
						</div>
					</div>
					<div className='column'>
						<Tabs
							className="cTabs"
							selectedTabClassName="cTabs_Tab--selected"
							disabledTabClassName="cTabs_Tab--disabled"
							selectedTabPanelClassName="cTabs_TabPanel--selected"
						>
							<TabList className="cTabs_TabList">
								<Tab className="cTabs_Tab">Resolution</Tab>
								<Tab className="cTabs_Tab">Editing</Tab>
								<Tab className="cTabs_Tab">Notes</Tab>
								<Tab className="cTabs_Tab">History</Tab>
							</TabList>

							<TabPanel className="cTabs_TabPanel">
								<div className='TopRow'>
									<div className='ResolutionStatus'>
							  			<label>
											<input
												type='checkbox'
												name='ResnStatus'
												value='A'
												checked={this.state.comment.ResnStatus === 'A'}
												onChange={this.changeCheckboxGroup}
											/>Accepted
										</label>
										<label>
											<input
												type='checkbox'
												name='ResnStatus'
												value='V'
												checked={this.state.comment.ResnStatus === 'V'}
												onChange={this.changeCheckboxGroup}
											/>Revised
										</label>
										<label>
											<input
												type='checkbox'
												name='ResnStatus'
												value='J'
												checked={this.state.comment.ResnStatus === 'J'}
												onChange={this.changeCheckboxGroup}
											/>Rejected
										</label>
									</div>
									<div className='Submission'>
										<label>Submission:
											<input
												className='SubmissionInput'
												type='text'
												name='Submission'
												value={this.state.comment.Submission}
												onChange={this.changeInput}
											/>
										</label>
									</div>
								</div>
								<div
									className='Resolution'
									contentEditable
									onInput={e => {
										this.setState({
											comment: update(this.state.comment, {Resolution: {$set: e.target.innerHTML}})
										});
									}}
									//dangerouslySetInnerHTML={{__html: this.state.comment.Resolution}}
								/>
							</TabPanel>
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
											name='EditedInDraft'
											value={this.state.comment.EditedInDraft}
											onChange={this.changeInput}
										/><br />
									</label>
							  	</div>
					  			<div
									className='EditingNotes'
									contentEditable
									onInput={e => {
										this.setState({
											comment: update(this.state.comment, {EditingNotes: {$set: e.target.innerHTML}})
										});
									}}
									//dangerouslySetInnerHTML={{__html: this.state.comment.EditingNotes}}
								/>
		          			</TabPanel>
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
        				</Tabs>
        			</div>
				</div>
	        </div>
		)
 	}
 }

 function mapStateToProps(state) {
  return {
    ballotId: state.comments.ballotId,
    commentData: state.comments.data,
    updateError: state.comments.updateError || state.comments.fetchError,
    errMsg: state.comments.errMsg,
    userData: state.users.data,
    isFetchingUsers: state.users.isFetching
  }
}
export default connect(mapStateToProps)(CommentDetail);