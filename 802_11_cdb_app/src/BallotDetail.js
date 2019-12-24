import PropTypes from 'prop-types';
import React, {useState, useEffect} from 'react';
import {connect} from 'react-redux';
import {useHistory, useParams} from 'react-router-dom'
import moment from 'moment-timezone';
import cx from 'classnames';
import AppModal from './AppModal';
import BallotSelector from './BallotSelector';
import {IconClose} from './Icons';
import {updateBallot, addBallot, getBallots} from './actions/ballots';
import {getVotingPool} from './actions/voters';
import styles from './BallotDetail.css';

/* Convert a Date object to US eastern time
 * and display only the date in format "yyyy-mm-dd" */
function strDate(isoDate) {
	var d = moment(isoDate).tz('America/New_York')
	console.log(d)
	return d.format('YYYY-MM-DD')
}

/* Parse date string (YYYY-MM-DD) and convert to a  */
function parseDate(etDateStr) {
	// Date is in format: "yyyy-mm-dd" and is always eastern time
	return new Date(moment.tz(etDateStr, 'YYYY-MM-DD', 'America/New_York').toUTCString())
}

function BallotDetail(props) {
	const history = useHistory();

	const [ballot, setBallot] = useState(props.ballot);
	const [dateStr, setDateStr] = useState(() => {console.log('init'); return {
		Start: strDate(props.ballot.Start),
		StartValid: true,
		End: strDate(props.ballot.End),
		EndValid: true
	}})

	useEffect(() => {
		if (!props.ballotsDataValid) {
			props.dispatch(getBallots())
		}
		if (!props.votingPoolDataValid) {
			props.dispatch(getVotingPool())
		}
	}, [])

	function onOpen() {
		setBallot(props.ballot)
		setDateStr({
			Start: strDate(props.ballot.Start),
			StartValid: true,
			End: strDate(props.ballot.End),
			EndValid: true
		})
	}

	function change(e) {
		const {name, value} = e.target;
		setBallot({...ballot, [name]: value});
	}

	function changeDate(e) {
		const {name, value} = e.target;
		const d = moment(value)
		setDateStr({...dateStr, [name]: value, [name+'Valid']: d.isValid()})
	}

	function changeType(e) {
		const {name, value, checked} = e.target;
		console.log({name, value, checked})
		setBallot({...ballot, [name]: parseInt(value, 10)})
	}

	function submit(e) {
		console.log(moment.tz(dateStr.Start, 'YYYY-MM-DD', 'America/New_York').format());
		ballot.Start = moment.tz(dateStr.Start, 'YYYY-MM-DD', 'America/New_York').toISOString();
		ballot.End = moment.tz(dateStr.End + ' 23:59:59', 'YYYY-MM-DD HH:MM:SS', 'America/New_York').toISOString();
		console.log(ballot);
		const action = props.action === 'add'? addBallot(ballot): updateBallot(ballot);
		props.dispatch(action).then(close)
	}

	function close() {
		history.goBack();
	}

	function renderVotingPoolOptions() {
		const votingPoolOptions = props.votingPoolData.map(i => <option key={i.VotingPoolID} value={i.VotingPoolID}>{i.Name}</option>);
		return (
			<div className={styles.row}>
				<label className={styles.initLabel}>Voting Pool:</label>
				<select
					name='VotingPoolID'
					value={ballot.VotingPoolID}
					onChange={change}
				>
					<option key={0} value={''}>Select Pool</option>
					{votingPoolOptions}
				</select>
			</div>
		)
	}

	function renderPrevBallotOptions() {
		const ballotOptions = (ballot.Project && props.ballotsByProject.hasOwnProperty(ballot.Project))
			? props.ballotsByProject[ballot.Project].map(i => <option key={i} value={i}>{i}</option>)
			: null;

		return (
			<div className={styles.row}>
				<label className={styles.initLabel}>Previous Ballot:</label>
				<select
					name='PrevBallotID'
					value={ballot.PrevBallotID}
					onChange={change}
				>
					<option key={0} value={''}>Select Ballot</option>
					{ballotOptions}
				</select>
			</div>
		)
	}

	//console.log(ballot.Project, props.ballotsByProject[ballot.Project])
	const ballotTypes = [
		'Comment collection',
		'Initial WG ballot',
		'Recirc WG ballot',
		'Initial SA ballot',
		'Recirc SA ballot'
	];

	console.log(ballot)
	return (
		//<AppModal
		//	isOpen={props.isOpen}
		//	onAfterOpen={onOpen}
		//	onRequestClose={props.close}
		//>
			<div className={styles.root}>
				<div className={styles.close}><IconClose className={styles.close} onClick={close} /></div>
				<div className={styles.row}>
					<div className={styles.column}>
						<div className={styles.row}>
							<label className={styles.initLabel}>Project:</label>
							<input type='text' name='Project' value={ballot.Project} onChange={change}/>
						</div>
						<div className={styles.row}>
							<label className={styles.initLabel}>Ballot ID:</label>
							<input type='text' name='BallotID' value={ballot.BallotID} onChange={change} readOnly={props.action !== 'add'}/>
						</div>
						<div className={styles.row}>
							<label className={styles.initLabel}>Epoll Number:</label>
							<input type='text' name='EpollNum' value={ballot.EpollNum} onChange={change} />
						</div>
					</div>
					<div className={styles.ballotTypeGroup}>
						{ballotTypes.map((str, i) => 
							<label key={i}><input type='radio' name='Type' value={i} checked={ballot.Type === i} onChange={changeType} />{str}</label>
						)}
					</div>
				</div>

				<div className={styles.row}>
					<label className={styles.initLabel}>Document:</label>
					<input type='text' name='Document' value={ballot.Document} onChange={change}/>
				</div>
				<div className={styles.row}>
					<label className={styles.initLabel}>Topic:</label>
					{/*<input className={styles.topic} type='textarea' name='Topic' value={ballot.Topic} onChange={change}/>*/}
					<textarea className={styles.topic} name='Topic' value={ballot.Topic} onChange={change} />
				</div>
				<div className={styles.row}>
					<label className={styles.initLabel}>Start/End:</label>
					<input type='text' className={cx({[styles.invalidDate]: !dateStr.StartValid})} name='Start' value={dateStr.Start} onChange={changeDate}/>
					<label className={styles.toLabel}>to</label>
					<input type='text' className={cx({[styles.invalidDate]: !dateStr.EndValid})} name='End' value={dateStr.End} onChange={changeDate}/>
				</div>

				<div className={styles.row}>
					<div className={styles.column}>
						{(ballot.Type === 1 || ballot.Type === 3) && renderVotingPoolOptions()}
						{(ballot.Type === 2 || ballot.Type === 4) && renderPrevBallotOptions()}
					</div>
					<div className={styles.importGroup}>
						<label><input type='checkbox' name='ImportResults' />Import Results</label>
						<label><input type='checkbox' name='ImportComments' />Import Comments</label>
					</div>
				</div>
				
				<div className={styles.row}>
					<button onClick={submit}>
						{props.action === 'add'? 'Add': 'Update'}
					</button>
					<button onClick={props.close}>Cancel</button>
				</div>
			</div>
		//</AppModal>
	)
}
BallotDetail.propTypes = {
	ballotsByProject: PropTypes.object.isRequired,
	ballotsDataValid: PropTypes.bool.isRequired,
	votingPoolData: PropTypes.array.isRequired,
	votingPoolDataValid: PropTypes.bool.isRequired,
	ballot: PropTypes.object.isRequired,
	action: PropTypes.oneOf(['add', 'update']),
	dispatch: PropTypes.func.isRequired
}

function mapStateToProps(state) {
	const {ballots, voters} = state
	return {
		action: ballots.editBallot.action,
		ballot: ballots.editBallot.ballot,
		ballotsDataValid: ballots.ballotsDataValid,
		ballotsByProject: ballots.ballotsByProject,
		votingPoolDataValid: voters.votingPoolDataValid,
		votingPoolData: voters.votingPoolData,
	}
}
export default connect(mapStateToProps)(BallotDetail);
