import React, {useEffect, useState} from 'react';
import {connect} from 'react-redux';
import DataListInput from 'react-datalist-input';
import {getBallots, setProject, setBallotId} from './actions/ballots';


function BallotSelector(props) {
	const {project, projectList, ballotId, ballotList, readOnly, onBallotSelected} = props;
	const [ballotIdStr, setBallotIdStr] = useState('')

	useEffect(() => {
		if (!props.ballotsDataValid) {
			props.dispatch(getBallots())
		}
	}, [])

	function handleProjectChange(e) {
		const project = e.target.value;
		if (project !== props.project) {
			props.dispatch(setProject(project))
		}
	}

	function handleBallotChange(e) {
		var bid = e.target.value;
		setBallotIdStr(bid)
		if (ballotList.findIndex(b => b.BallotID === bid) >= 0) {
			props.dispatch(setBallotId(bid));
			if (onBallotSelected) {
				onBallotSelected(bid)
			}
		}
	}

	/*function renderProjectSelector() {
		return (
			<select
				name='Project'
				value={project}
				onChange={handleProjectChange}
				disabled={projectList.length === 0}
			>
				<option value='' disabled >Select</option>
				{projectList.map(i => {
					return (<option key={i} value={i}>{i}</option>)
				})}
			</select>
		)
	}*/
	function renderProjectSelector() {
		return (
			<React.Fragment>
			<input
				type='search'
				name='Project'
				value={project}
				onChange={handleProjectChange}
				//disabled={projectList.length === 0}
				list='projectList'
			/>
			<datalist id='projectList'>
				{projectList.map(i => {
					return (<option key={i} value={i} />)
				})}
			</datalist>
			</React.Fragment>
		)
	}

	/*function renderBallotSelector() {
		return (
			<select
				name='Ballot'
				value={ballotId}
				onChange={handleBallotChange}
				disabled={ballotList.length === 0}
			>
				<option value={''} disabled >Select</option>
				{ballotList.map(i => {
					const desc = `${i.BallotID} ${i.Document}`.substring(0,32)
					return (<option key={i.BallotID} value={i.BallotID}>{desc}</option>)
				})}
			</select>
		)
	}*/
	function renderBallotSelector() {
		return (
			<React.Fragment>
				<input
					type='search'
					name='Ballot'
					value={ballotIdStr}
					onChange={handleBallotChange}
					disabled={ballotList.length === 0}
					list='ballotList'
				/>
				<datalist id='ballotList'>
					{ballotList.map(i => {
						return (<option key={i.BallotID} value={i.BallotID} >{i.Document.substring(0,32)}</option>)
					})}
				</datalist>
			</React.Fragment>
		)
	}
	/*function onSelect(item) {
		const bid = item.key
		console.log(bid)
		props.dispatch(setBallotId(bid));
		if (onBallotSelected) {
			onBallotSelected(bid)
		}
	}
	function renderBallotSelector() {
		const items = ballotList.map((b, i) => {
	        return {
	            label: b.BallotID  + ": " + b.Document,
	            key: b.BallotID,
	        }
    	});
		return (
			<DataListInput
				placeholder={"Select..."}
				items={items}
				onSelect={onSelect}
				//match={this.matchCurrentInput}
			/>
		)
	}*/
		
	const ballot = ballotList.find(b => b.BallotID === ballotId)
	const ballotDescr = ballot? `${ballot.BallotID} ${ballot.Document}`.substring(0,32): ballotId.toString()
	return (
		<div style={{display: 'inline-block'}}>
			<label>Project:
				{readOnly? project: renderProjectSelector()}
			</label>
			<label>Ballot:
				{readOnly? ballotDescr: renderBallotSelector()}
			</label>
		</div>
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