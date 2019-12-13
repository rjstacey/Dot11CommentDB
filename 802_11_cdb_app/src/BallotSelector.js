import React from 'react';
import {connect} from 'react-redux';
import {getBallots, setProject, setBallotId} from './actions/ballots';


class BallotSelector extends React.PureComponent {

	componentDidMount() {
		if (!this.props.ballotsDataValid) {
			this.props.dispatch(getBallots())
		}
	}

	handleProjectChange = (e) => {
		const project = e.target.value;
		if (project !== this.props.project) {
			this.props.dispatch(setProject(project))
		}
	}

	handleBallotChange = (e) => {
		var ballotId = e.target.value;
		this.props.dispatch(setBallotId(ballotId));
		if (this.props.onBallotSelected) {
			this.props.onBallotSelected(ballotId)
		}
	}

	renderProjectSelector = () => {
		const {project, projectList} = this.props;
		return (
			<select
				name='Project'
				value={project}
				onChange={this.handleProjectChange}
				disabled={projectList.length === 0}
			>
				<option value='' disabled >Select</option>
				{projectList.map(i => {
					return (<option key={i} value={i}>{i}</option>)
				})}
			</select>
		)
	}

	renderBallotSelector = () => {
		const {ballotId, ballotList} = this.props;
		return (
			<select
				name='Ballot'
				value={ballotId}
				onChange={this.handleBallotChange}
				disabled={ballotList.length === 0}
			>
				<option value={''} disabled >Select</option>
				{ballotList.map(i => {
					const desc = `${i.BallotID} ${i.Document}`.substring(0,32)
					return (<option key={i.BallotID} value={i.BallotID}>{desc}</option>)
				})}
			</select>
		)
	}

	render() {
		const {project, ballotId, ballotList, readOnly} = this.props;
		const ballot = ballotList.find(b => b.BallotID === ballotId)
		const ballotDescr = ballot? `${ballot.BallotID} ${ballot.Document}`.substring(0,32): ballotId.toString()
		return (
			<div style={{display: 'inline-block'}}>
				<label>Project:
					{readOnly? project: this.renderProjectSelector()}
				</label>
				<label>Ballot:
					{readOnly? ballotDescr: this.renderBallotSelector()}
				</label>
			</div>
		)
	}
}

function mapStateToProps(state) {
	const {ballots} = state;
	return {
		project: ballots.project,
		ballotId: ballots.ballotId,
		projectList: ballots.projectList,
		ballotList: ballots.ballotList,
		ballotsDataValid: ballots.ballotsDataValid,
		ballotsData: ballots.ballotsData,
	}
}
export default connect(mapStateToProps)(BallotSelector);