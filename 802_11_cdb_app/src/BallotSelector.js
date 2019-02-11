import React from 'react';
import {connect} from 'react-redux';
import {getBallots, setProject, setBallotId} from './actions/ballots';


class BallotSelector extends React.Component {

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

	render() {
		const {projectList, ballotList} = this.props;
		return (
			<div className='row'>
				<label>Project:
					<select
						name='Project'
						value={this.props.project}
						onChange={this.handleProjectChange}
						disabled={projectList.length === 0}
					>
						<option value='' disabled={true}>Select</option>
						{projectList.map(i => {
							return (<option key={i} value={i}>{i}</option>)
						})}
					</select>
				</label>
				<label>Ballot:
					<select
						name='Ballot'
						value={this.props.ballotId}
						onChange={this.handleBallotChange}
						disabled={ballotList.length === 0}
					>
						<option value={''} disabled={true}>Select</option>
						{ballotList.map(i => {
							const desc = `${i.BallotID} ${i.Document}`.substring(0,32)
							return (<option key={i.BallotID} value={i.BallotID}>{desc}</option>)
						})}
					</select>
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