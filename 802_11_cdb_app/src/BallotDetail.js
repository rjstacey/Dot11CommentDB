import PropTypes from 'prop-types';
import React, {useState, useEffect, useRef} from 'react';
import {connect} from 'react-redux';
import {useHistory, useParams} from 'react-router-dom'
import moment from 'moment-timezone';
import ConfirmModal from './ConfirmModal';
import {IconClose} from './Icons';
import {updateBallot, addBallot, getBallots} from './actions/ballots';
import {getVotingPool} from './actions/voters';
import {importResults, uploadResults, deleteResults} from './actions/results';
import {importComments, uploadComments, deleteCommentsWithBallotId} from './actions/comments';
import styles from './BallotDetail.css';

function defaultBallot() {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return {
		Project: '',
		BallotID: '',
		EpollNum: '',
		Document: '',
		Topic: '',
		Start: today.toISOString(),
		End: today.toISOString(),
		VotingPoolID: 0,
		PrevBallotID: ''}
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

/* Convert an ISO date string to US eastern time
 * and display only the date in format "yyyy-mm-dd" */
function dateToShortDate(isoDate) {
	return moment(isoDate).tz('America/New_York').format('YYYY-MM-DD')
}

/* Parse date (YYYY-MM-DD) as US eastern time and convert to ISO date string */
function shortDateToDate(shortDateStr) {
	return moment.tz(shortDateStr, 'YYYY-MM-DD', 'America/New_York').format()
}

function renderResultsSummary(results) {
	var resultsStr = '';
	if (results && results.TotalReturns) {
		let p = parseFloat(100*results.Approve/(results.Approve+results.Disapprove));
		resultsStr = `${results.Approve}/${results.Disapprove}/${results.Abstain}`
		if (!isNaN(p)) {
			resultsStr += ` (${p.toFixed(1)}%)`
		}
	}
	return resultsStr? resultsStr: 'None'
}

/*
 * Ballot detail is mounted from
 * /Ballot/:ballotId -> update an existing ballot
 * /Ballot/ -> add a new ballot
 * /ImportEpoll/:epollNum -> add a new ballot from an epoll
 */
function BallotDetail(props) {
	const {ballotId, epollNum} = useParams();
	const history = useHistory();
	const [ballot, setBallot] = useState(defaultBallot);
	const [resultsAction, setResultsAction] = useState({
		importFromEpoll: false,
		file: null,
		remove: false
	});
	const resultsFileRef = useRef();
	const [commentsAction, setCommentsAction] = useState({
		importFromEpoll: false,
		file: null,
		remove: false
	})
	const commentsFileRef = useRef();

	/* On mount, make sure we have the ballots and voting pools loaded */
	useEffect(() => {
		if (!props.ballotsDataValid) {
			props.dispatch(getBallots())
		}
		if (!props.votingPoolDataValid) {
			props.dispatch(getVotingPool())
		}
	}, [])

	/* On mount or if the underlying data changes,
	 * reload the ballot from ballot data or epoll data as appropriate. */
	useEffect(() => {
		if (ballotId) {
			const b = props.ballotsData.find(b => b.BallotID === ballotId)
			if (b) {
				setBallot(b)
			}
		}
		else if (epollNum) {
			const e = props.epollsData.find(e => e.EpollNum === epollNum)
			if (e) {
				const b = {
					Project: '',
					BallotID: e.BallotID,
					EpollNum: epollNum,
					Document: e.Document,
					Topic: e.Topic,
					Start: e.Start,
					End: e.End,
					VotingPoolID: 0,
					PrevBallotID: ''
				}
				setBallot(b)
			}
		}
	}, [props.ballotsData, props.epollsData])

	function change(e) {
		const {name, value} = e.target;
		setBallot({...ballot, [name]: value});
	}

	function changeDate(e) {
		const {name, value} = e.target;
		const dateStr = shortDateToDate(value)
		console.log(dateStr)
		setBallot({...ballot, [name]: dateStr})
	}

	function changeType(e) {
		const {name, value} = e.target;
		setBallot({...ballot, [name]: parseInt(value, 10)})
	}

	async function submit(e) {
		let action = null;
		if (ballotId) {
			const b = props.ballotsData.find(b => b.BallotID === ballotId)
			if (b) {
				let changed = shallowDiff(b, ballot)
				if (changed !== {}) {
					action = updateBallot(ballotId, changed);
				}
			}
		}
		else {
			action = addBallot(ballot)
		}

		if (resultsAction.remove) {
			const ok = await ConfirmModal.show(`Are you sure you want to delete results for ${ballot.BallotID}?`)
			if (!ok) {
				return;
			}
		}
		if (commentsAction.remove) {
			const ok = await ConfirmModal.show(`Are you sure you want to delete comments for ${ballot.BallotID}?`)
			if (!ok) {
				return;
			}
		}

		if (action) {
			await props.dispatch(action)
		}

		if (resultsAction.remove) {
			props.dispatch(deleteResults(ballot.BallotID))
		}
		else if (resultsAction.importFromEpoll) {
			props.dispatch(importResults(ballot.BallotID, ballot.EpollNum))
		}
		else if (resultsAction.file) {
			props.dispatch(uploadResults(ballotId, resultsAction.file))
		}

		if (commentsAction.remove) {
			props.dispatch(deleteCommentsWithBallotId(ballot.BallotID))
		}
		else if (commentsAction.importFromEpoll) {
			props.dispatch(importComments(ballot.BallotID, ballot.EpollNum, 1))
		}
		else if (commentsAction.file) {
			props.dispatch(uploadComments(ballotId, ballot.Type, commentsAction.file))
		}

		/* Once we have added a ballot, we navigate there so that furhter changes are updates */
		if (action && !ballotId) {
			history.replace(`/Ballot/${ballot.BallotID}`)
		}
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

	function handleResultsRemove(e) {
		setResultsAction({
			fileName: null,
			importFromEpoll: false,
			remove: e.target.checked
		})
	}

	function handleResultsFromEpoll(e) {
		setResultsAction({
			fileName: null,
			importFromEpoll: e.target.checked,
			remove: false
		})
	}

	function handleResultsFromFile(e) {
		if (e.target.checked) {
			resultsFileRef.current.click()
		}
		else {
			setResultsAction({...resultsAction, fileName: null})
		}
	}

	function handleResultsFileSelected(e) {
		setResultsAction({
			fileName: e.target.files[0].name,
			importFromEpoll: false,
			remove: false
		})
	}

	function ResultsActions() {
		return (
			<React.Fragment>
			<div className={styles.row}>
				<label>Results:</label>&nbsp;{renderResultsSummary(ballot.Results)}
			</div>
			<div className={styles.fromColumn}>
				<label>
					<input
						type='checkbox'
						checked={resultsAction.remove}
						onChange={handleResultsRemove}
					/> Delete
				</label>
				{ballot.EpollNum &&
					<label>
						<input
							type='checkbox'
							checked={resultsAction.importFromEpoll}
							onChange={handleResultsFromEpoll}
						/> Import from ePoll
					</label>
				}
				<label>
					<input
						type='checkbox'
						checked={resultsAction.file !== null}
						onChange={handleResultsFromFile}
					/> Upload from {resultsAction.file? resultsAction.file.name: 'file'}
					<input
						type='file'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={resultsFileRef}
						onChange={handleResultsFileSelected}
						style={{display: "none"}}
					/>
				</label>
			</div>
			</React.Fragment>
		)
	}

	function handleCommentsRemove(e) {
		setCommentsAction({
			file: null,
			importFromEpoll: false,
			remove: e.target.checked
		})
	}

	function handleCommentsFromEpoll(e) {
		setCommentsAction({
			file: null,
			importFromEpoll: e.target.checked,
			remove: false
		})
	}

	function handleCommentsFromFile(e) {
		if (e.target.checked) {
			commentsFileRef.current.click()
		}
		else {
			setCommentsAction({...commentsAction, file: null})
		}
	}

	function handleCommentsFileSelected(e) {
		setCommentsAction({
			file: e.target.files[0],
			importFromEpoll: false,
			remove: false
		})
	}

	function CommentsActions() {
		return (
			<React.Fragment>
			<div className={styles.row}>
				<label>Comments:</label>&nbsp;{ballot.Comments? ballot.Comments.Count: 'None'}
			</div>
			<div className={styles.fromColumn}>
				{ballot.Comments &&
					<label>
						<input
							type='checkbox'
							checked={commentsAction.remove}
							onChange={handleCommentsRemove}
						/> Delete
					</label>
				}
				{ballot.EpollNum &&
					<label>
						<input
							type='checkbox'
							checked={commentsAction.importFromEpoll}
							onChange={handleCommentsFromEpoll}
						/> {ballot.Comments? 'Reimport': 'Import'} from ePoll
					</label>
				}
				<label>
					<input
						type='checkbox'
						checked={commentsAction.file !== null}
						onChange={handleCommentsFromFile}
					/> Upload from {commentsAction.file? commentsAction.file.name: 'file'}
					<input
						type='file'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={commentsFileRef}
						onChange={handleCommentsFileSelected}
						style={{display: "none"}}
					/>
				</label>
			</div>
			</React.Fragment>
		)
	}

	const ballotTypes = [
		'Comment collection',
		'Initial WG ballot',
		'Recirc WG ballot',
		'Initial SA ballot',
		'Recirc SA ballot'
	];

	const shortDateStart = dateToShortDate(ballot.Start)
	const shortDateEnd = dateToShortDate(ballot.End)
	return (
		<div className={styles.root}>
			<div className={styles.close}><IconClose className={styles.close} onClick={close} /></div>
			<div className={styles.row}>
				<div className={styles.column}>
					<div className={styles.row}>
						<label className={styles.initLabel}>Project:</label>
						<input type='text' name='Project' value={ballot.Project} onChange={change} list='projectList' />
						<datalist id='projectList'>
							{props.projectList.map(p => {return <option key={p} value={p} />})}
						</datalist>
					</div>
					<div className={styles.row}>
						<label className={styles.initLabel}>Ballot ID:</label>
						<input type='text' name='BallotID' value={ballot.BallotID} onChange={change} />
					</div>
					{(ballot.Type !== 3 && ballot.Type !== 4) &&
					<div className={styles.row}>
						<label className={styles.initLabel}>ePoll Number:</label>
						<input type='text' name='EpollNum' value={ballot.EpollNum} onChange={change} />
					</div>}
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
				<textarea className={styles.topic} name='Topic' value={ballot.Topic} onChange={change} />
			</div>
			<div className={styles.row}>
				<div className={styles.column}>
					<div className={styles.row}>
						<label className={styles.initLabel}>Start:</label>
						<input type='date' name='Start' value={shortDateStart} onChange={changeDate} />
					</div>
					<div className={styles.row}>
						<label className={styles.initLabel}>End</label>
						<input type='date' name='End' value={shortDateEnd} onChange={changeDate} />
					</div>
					<div className={styles.row}>
						{(ballot.Type === 1 || ballot.Type === 3) && renderVotingPoolOptions()}
						{(ballot.Type === 2 || ballot.Type === 4) && renderPrevBallotOptions()}
					</div>
				</div>
				<div className={styles.importGroup}>
					<ResultsActions />
					<CommentsActions />
				</div>
			</div>
			
			<div className={styles.row}>
				<button onClick={submit}>
					{ballotId? 'Update': 'Add'}
				</button>
				<button onClick={close}>Cancel</button>
			</div>
		</div>
	)
}
BallotDetail.propTypes = {
	ballotsDataValid: PropTypes.bool.isRequired,
	ballotsData: PropTypes.array.isRequired,
	ballotsByProject: PropTypes.object.isRequired,
	projectList: PropTypes.array.isRequired,
	votingPoolDataValid: PropTypes.bool.isRequired,
	votingPoolData: PropTypes.array.isRequired,
	epollsDataValid: PropTypes.bool.isRequired,
	epollsData: PropTypes.array.isRequired,
	dispatch: PropTypes.func.isRequired
}

function mapStateToProps(state) {
	const {ballots, voters, epolls} = state
	return {
		ballotsDataValid: ballots.ballotsDataValid,
		ballotsData: ballots.ballotsData,
		ballotsByProject: ballots.ballotsByProject,
		projectList: ballots.projectList,
		votingPoolDataValid: voters.votingPoolDataValid,
		votingPoolData: voters.votingPoolData,
		epollsDataValid: epolls.epollsDataValid,
		epollsData: epolls.epollsData,
	}
}
export default connect(mapStateToProps)(BallotDetail);
