import React, {useEffect} from 'react';
import {connect} from 'react-redux';
import {getBallots, setProject, setBallotId} from './actions/ballots';


function BallotSelector(props) {
	const {project, projectList, ballotId, ballotList, readOnly, onBallotSelected} = props;

	useEffect(() => {
		if (!props.ballotsDataValid) {
			props.dispatch(getBallots())
		}
	}, [])

	function handleProjectChange(e) {
		console.log('project change')
		const project = e.target.value;
		if (project !== props.project) {
			props.dispatch(setProject(project))
		}
	}

	function handleBallotChange(e) {
		console.log('ballot change')
		var ballotId = e.target.value;
		props.dispatch(setBallotId(ballotId));
		if (onBallotSelected) {
			onBallotSelected(ballotId)
		}
	}

	function renderProjectSelector() {
		return (
			<select
				name='Project'
				value={project}
				onChange={handleProjectChange}
				disabled={projectList.length === 0}
				style={{width: '100px'}}
			>
				<option value='' disabled >Select</option>
				{projectList.map(i => {
					return (<option key={i} value={i}>{i}</option>)
				})}
			</select>
		)
	}

	function renderBallotSelector() {
		return (
			<select
				name='Ballot'
				value={ballotId}
				onChange={handleBallotChange}
				disabled={ballotList.length === 0}
				style={{width: '160px'}}
			>
				<option value={''} disabled >Select</option>
				{ballotList.map(i => {
					const desc = `${i.BallotID} ${i.Document}`.substring(0,32)
					return (<option key={i.BallotID} value={i.BallotID}>{desc}</option>)
				})}
			</select>
		)
	}

	const ballot = ballotList.find(b => b.BallotID === ballotId)
	const ballotDescr = ballot? `${ballot.BallotID} ${ballot.Document}`.substring(0,32): ballotId.toString()
	return (
		<span>
			<span>
				<label style={{marginLeft: '10px'}}>Project:</label>&nbsp;
				{readOnly? <div style={{display: 'inline-block', width: '100px'}}>{project}</div>: renderProjectSelector()}
			</span>
			<span>
				<label style={{marginLeft: '5px'}}>Ballot:</label>&nbsp;
				{readOnly? <div style={{display: 'inline-block'}}>{ballotDescr}</div>: renderBallotSelector()}
			</span>
		</span>
	)
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