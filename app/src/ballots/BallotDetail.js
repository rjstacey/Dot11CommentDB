import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import Select from 'react-dropdown-select'
import AppModal from '../modals/AppModal'
import ConfirmModal from '../modals/ConfirmModal'
import {Checkbox, Search} from '../general/Icons'
import {renderResultsSummary, renderCommentsSummary} from './Ballots'
import {updateBallot, addBallot, getBallots, setProject} from '../actions/ballots'
import {getProjectList, getBallotList} from '../selectors/ballots'
import {getVotingPools} from '../actions/votingPools'
import {importResults, uploadResults, deleteResults} from '../actions/results'
import {importComments, uploadComments, deleteComments, setStartCommentId} from '../actions/comments'
import {shallowDiff} from '../lib/utils'

function defaultBallot() {
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	return {
		Project: '',
		BallotID: '',
		EpollNum: '',
		Document: '',
		Topic: '',
		Start: today.toISOString(),
		End: today.toISOString(),
		VotingPoolID: '',
		PrevBallotID: ''}
}

/* Convert an ISO date string to US eastern time and return string in form "YYYY-MM-DD" */
function dateToShortDate(isoDate) {
	const utcDate = new Date(isoDate)
	const date = new Date(utcDate.toLocaleString("en-US", {timeZone: "America/New_York"}))
	return date.getFullYear() + '-' + ('0' + (date.getMonth()+1)).substr(-2) + '-' + ('0' + date.getDate()).substr(-2)
}

/* Parse date in form "YYYY-MM-DD" as US eastern time and convert to UTC ISO date string */
function shortDateToDate(shortDateStr) {
	const date = new Date(shortDateStr)	// local time
	const easternDate = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}))
	const utcDate = new Date(date.toLocaleString("en-US", {timeZone: "UTC"}))
	const diff = utcDate - easternDate
	let newDate = new Date(date.getTime() + diff)
	console.log(newDate)
	console.log(newDate instanceof Date && !isNaN(newDate))
	return isNaN(newDate)? '': newDate.toISOString()
}

function SelectProject({project, projectList, onChange, ...otherProps}) {
	const options = projectList.map(p => ({value: p, label: p}))
	const value = options.find(o => o.value === project)
	const handleChange = (values) => onChange(values.length > 0? values[0].value: '')
	return <Select values={value? [value]: []} options={options} onChange={handleChange} create clearable searchable {...otherProps} />
}

function SelectVotingPoolId({votingPoolId, votingPools, onChange, ...otherProps}) {
	const options = votingPools.map(i => ({value: i.VotingPoolID, label: i.VotingPoolID}))
	const value = options.find(o => o.value === votingPoolId)
	const handleChange = (values) => onChange(values.length? values[0].value: '')
	return <Select values={value? [value]: []} options={options} onChange={handleChange} {...otherProps} />
}

function SelectPrevBallot({prevBallotId, ballotList, onChange, ...otherProps}) {
	const options = ballotList//.map(i => ({value: i.VotingPoolID, label: i.VotingPoolID}))
	const value = options.find(o => o.value === prevBallotId)
	const handleChange = (values) => onChange(values.length? values[0].value: '')
	return <Select values={value? [value]: []} options={options} onChange={handleChange} {...otherProps} />
}

const BallotTypesContainer = styled.div`
	display: flex;
	flex-direction: column;
	padding: 20px;`

function BallotTypes({value, onChange}) {
	const ballotTypes = [
		'Comment collection',
		'Initial WG ballot',
		'Recirc WG ballot',
		'Initial SA ballot',
		'Recirc SA ballot',
		'Motion'
	]
	return (
		<BallotTypesContainer>
			<label>Ballot Type:</label>
			{ballotTypes.map((str, i) => 
				<span key={i}>
					<input id={'radio_'+ i} type='radio' name='Type' value={i} checked={value === i} onChange={onChange} />
					<label htmlFor={'radio_'+ i} >{str}</label>
				</span>
			)}
		</BallotTypesContainer>
	)
}

const ActionsContainer = styled.div`
	display: flex;
	flex-direction: column;
	padding: 20px;`

const CommentsActions = ({action, setAction, ballot, file, setFile, startCID, setStartCID}) => {
	const fileRef = React.useRef();
	return (
		<ActionsContainer>
			<span>
				<label>Comments:&nbsp;</label>
				{renderCommentsSummary({rowData: ballot, key: 'Comments'})}
			</span>
			<span>
				<Checkbox
					id='start'
					checked={action === Action.SET_START_CID}
					onChange={e => setAction(action !== Action.SET_START_CID? Action.SET_START_CID: Action.NONE)}
				/>
				<label htmlFor='start'>Change starting CID:&nbsp;</label>
				<Search
					width={80}
					value={startCID}
					onChange={e => setStartCID(e.target.value)}
				/>
			</span>
			{ballot.Comments &&
				<span>
					<Checkbox
						id='delete'
						checked={action === Action.REMOVE}
						onChange={e => setAction(action !== Action.REMOVE? Action.REMOVE: Action.NONE)}
					/>
					<label htmlFor='delete'>Delete</label>
				</span>
			}
			{ballot.EpollNum &&
				<span>
					<Checkbox
						id='importFromEpoll'
						checked={action === Action.IMPORT_FROM_EPOLL}
						onChange={e => setAction(action !== Action.IMPORT_FROM_EPOLL? Action.IMPORT_FROM_EPOLL: Action.NONE)}
					/>
					<label htmlFor='importFromEpoll'>{(ballot.Comments? 'Reimport': 'Import') + ' from ePoll'}</label>
				</span>
			}
			<span>
				<Checkbox
					id='file'
					checked={action === Action.IMPORT_FROM_FILE}
					onChange={e => action !== Action.IMPORT_FROM_FILE? fileRef.current.click(): setAction(Action.NONE)}
				/>
				<label htmlFor='file'>{'Upload from ' + (file? file.name: 'file')}</label>
			</span>
			<input
				type='file'
				accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				ref={fileRef}
				onChange={e => {
					if (e.target.files) {
						setAction(Action.IMPORT_FROM_FILE);
						setFile(e.target.files[0]);
					}
					else {
						setAction(Action.NONE);
						setFile(null);
					}
				}}
				style={{display: "none"}}
			/>
		</ActionsContainer>
	)
}

const ResultsActions = ({action, setAction, ballot, file, setFile}) => {
	const fileRef = React.useRef();
	return (
		<ActionsContainer>
			<span>
				<label>Results:&nbsp;</label>
				{renderResultsSummary({rowData: ballot, key: 'Results'})}
			</span>
			<span>
				<Checkbox
					id='delete'
					checked={action === Action.REMOVE}
					onChange={e => setAction(action !== Action.REMOVE? Action.REMOVE: Action.NONE)}
				/>
				<label htmlFor='delete'>Delete</label>
			</span>
			{ballot.EpollNum &&
				<span>
					<Checkbox
						id='importFromEpoll'
						checked={action === Action.IMPORT_FROM_EPOLL}
						onChange={e => setAction(action !== Action.IMPORT_FROM_EPOLL? Action.IMPORT_FROM_EPOLL: Action.NONE)}
					/>
					<label htmlFor='importFromEpoll'>{(ballot.Results? 'Reimport': 'Import') + ' from ePoll'}</label>
				</span>
			}
			<span>
				<Checkbox
					id='fromFile'
					checked={action === Action.IMPORT_FROM_FILE}
					onChange={e => action !== Action.IMPORT_FROM_FILE? fileRef.current.click(): setAction(Action.NONE)}
				/>
				<label htmlFor='fromFile'>{'Upload from ' + (file? file.name: 'file')}</label>
			</span>
			<input
				type='file'
				accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				ref={fileRef}
				onChange={e => {
					if (e.target.files) {
						setAction(Action.IMPORT_FROM_FILE);
						setFile(e.target.files[0]);
					}
					else {
						setAction(Action.NONE);
						setFile(null);
					}
				}}
				style={{display: "none"}}
			/>
		</ActionsContainer>
	)
}

const Container = styled.div`
	display: flex;
	flex-direction: column;
	width: 80vw;
	max-width: 1000px;
`;

const Row = styled.div`
	display: flex;
	flex-direction: row;
	margin: 10px;
`;

const Col = styled.div`
	display: flex;
	flex-direction: column;
`;

const Col1 = styled(Col)`
	flex: 60% 1 1;
	& label {
		width: 150px;
	}
`;

const Col2 = styled(Col)`
	flex: 40% 1 1;
`;

const Row2 = styled(Row)`
	& label {
		flex: 100px 0 0;
	}
	& textarea {
		flex: 1;
		height: 3em;
	}
`;

const Col3 = styled(Col)`
	flex: 60% 1 1;
	& label {
		width: 150px;
	}
`;

const Col4 = styled(Col)`
	flex: 40% 1 1;
	display: flex;
	& label {
		width: 200px;
	}
`;

const ButtonRow = styled(Row)`
	justify-content: space-around;
`;

const Action = {
	NONE: null,
	REMOVE: 'remove',
	IMPORT_FROM_EPOLL: 'import_from_epoll',
	IMPORT_FROM_FILE: 'import_from_file',
	SET_START_CID: 'set_start_CID'
}

/*
 * Ballot detail is mounted from
 * The ballotId parameter is '+' to add a new ballot or a ballot ID to update a ballot
 * If the ballotId parameter is '+' and epollNum is provided, then the ballot fields are filled in from the epoll data
 */
function BallotDetail(props) {
	const {ballotId, epollNum} = props;
	const [ballot, setBallot] = React.useState(defaultBallot);
	const [resultsAction, setResultsAction] = React.useState(Action.NONE);
	const [resultsFile, setResultsFile] = React.useState('');
	const [commentsAction, setCommentsAction] = React.useState(Action.NONE);
	const [commentsFile, setCommentsFile] = React.useState(null);
	const [startCID, setStartCID] = React.useState('');

	/* On mount, make sure we have the ballots and voting pools loaded */
	React.useEffect(() => {
		if (!props.ballotsValid)
			props.getBallots()
		if (!props.votingPoolsValid)
			props.getVotingPools()
	}, []);

	/* On mount or if the underlying data changes,
	 * reload the ballot from ballot data or epoll data as appropriate. */
	React.useEffect(() => onOpen(), [ballotId, props.ballots, props.epolls]);

	const onOpen = () => {
		if (ballotId === '+') {
			if (epollNum) {
				const e = props.epolls.find(e => e.EpollNum === epollNum)
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
				else {
					setBallot(defaultBallot)
				}
			}
			else {
				setBallot(defaultBallot)
			}
		}
		else if (ballotId) {
			const b = props.ballots.find(b => b.BallotID === ballotId)
			if (b) {
				setBallot(b)
				setStartCID(b.Comments? b.Comments.CommentIDMin: 0)
			}
		}
	}


	function change(e) {
		const {name, value} = e.target;
		setBallot({...ballot, [name]: value});
	}

	function handleProjectChange(project) {
		//const project = values.length > 0? values[0].value: ''
		props.setProject(project)
		setBallot(ballot => ({...ballot, Project: project}))
	}

	function changeDate(e) {
		const {name, value} = e.target;
		console.log(value)
		const dateStr = shortDateToDate(value)
		setBallot(ballot => ({...ballot, [name]: dateStr}))
	}

	function changeType(e) {
		const {name, value} = e.target;
		setBallot(ballot => ({...ballot, [name]: parseInt(value, 10)}))
	}

	/* All the database manipulation functions are asynchornous. They need to be issues in the right order
	 * but don't need to complete until the next is started. */
	async function submit() {

		// Delete stuff first
		if (resultsAction === Action.REMOVE) {
			const ok = await ConfirmModal.show(`Are you sure you want to delete results for ${ballot.BallotID}?`)
			if (!ok)
				return
			props.deleteResults(ballot.BallotID)
		}

		if (commentsAction === Action.REMOVE) {
			const ok = await ConfirmModal.show(`Are you sure you want to delete comments for ${ballot.BallotID}?`)
			if (!ok)
				return
			props.deleteComments(ballot.BallotID)
		}

		// Update or create ballot entry
		if (ballotId === '+') {
			props.addBallot(ballot)
		}
		else {
			const b = props.ballots.find(b => b.BallotID === ballotId)
			if (b) {
				let changed = shallowDiff(b, ballot)
				if (changed !== {}) {
					props.updateBallot(ballotId, changed)
				}
			}
		}

		// import or update results
		if (resultsAction === Action.IMPORT_FROM_EPOLL) {
			props.importResults(ballot.BallotID, ballot.EpollNum)
		}
		else if (resultsAction === Action.IMPORT_FROM_FILE) {
			props.uploadResults(ballotId, ballot.Type, resultsFile)
		}

		// import or update results
		if (commentsAction === Action.SET_START_CID) {
			props.setStartCommentId(ballotId, startCID)
		}
		else if (commentsAction === Action.IMPORT_FROM_EPOLL) {
			props.importComments(ballot.BallotID, ballot.EpollNum, 1)
		}
		else if (commentsAction === Action.IMPORT_FROM_FILE) {
			props.uploadComments(ballotId, ballot.Type, commentsFile)
		}

		props.close()
	}

	const shortDateStart = dateToShortDate(ballot.Start)
	const shortDateEnd = dateToShortDate(ballot.End)
	return (
		<AppModal
			isOpen={props.isOpen}
			onAfterOpen={onOpen}
			onRequestClose={props.close}
		>
			<Container>
				<Row>
					<Col1>
						<Row>
							<label>Project:</label>
							<SelectProject
								project={ballot.Project}
								projectList={props.projectList}
								onChange={handleProjectChange}
								style={{width: '150px'}}
							/>
						</Row>

						<Row>
							<label>Ballot ID:</label>
							<Search name='BallotID' value={ballot.BallotID} onChange={change} />
						</Row>

						{(ballot.Type !== 3 && ballot.Type !== 4) &&
							<Row>
								<label>ePoll Number:</label>
								<Search name='EpollNum' value={ballot.EpollNum} onChange={change} />
							</Row>
						}

						<Row>
							<label>Document:</label>
							<Search name='Document' value={ballot.Document} onChange={change}/>
						</Row>
					</Col1>
					<Col2>
						<BallotTypes value={ballot.Type} onChange={changeType} />
					</Col2>
				</Row>
				<Row>
					<Col>
						<Row2>
							<label>Topic:</label>
							<textarea name='Topic' value={ballot.Topic} onChange={change} />
						</Row2>
					</Col>
				</Row>
				<Row>
					<Col3>
						<Row>
							<label>Start:</label>
							<input type='date' name='Start' value={shortDateStart} onChange={changeDate} />
						</Row>
						<Row>
							<label>End</label>
							<input type='date' name='End' value={shortDateEnd} onChange={changeDate} />
						</Row>
						{(ballot.Type === 1 || ballot.Type === 3 || ballot.Type === 5) &&		
							<Row>
								<label>Voting Pool:</label>
								<SelectVotingPoolId 
									votingPoolId={ballot.VotingPoolID}
									votingPools={props.votingPools}
									onChange={value => setBallot({...ballot, VotingPoolID: value})}
									style={{width: '250px'}}
								/>
							</Row>
						}
						{(ballot.Type === 2 || ballot.Type === 4) &&
							<Row>
								<label>Previous Ballot:</label>
								<SelectPrevBallot
									prevBallotId={ballot.PrevBallotID}
									ballotList={props.ballotList}
									onChange={value => setBallot({...ballot, PrevBallotID: value})}
									style={{width: '250px'}}
								/>
							</Row>
						}
					</Col3>
					<Col4>
						<ResultsActions
							action={resultsAction}
							setAction={setResultsAction}
							ballot={ballot}
							file={resultsFile}
							setFile={setResultsFile}
						/>
						<CommentsActions 
							action={commentsAction}
							setAction={setCommentsAction}
							ballot={ballot}
							file={commentsFile}
							setFile={setCommentsFile}
							startCID={startCID}
							setStartCID={setStartCID}
						/>
					</Col4>
				</Row>
				<ButtonRow>
					<button onClick={submit}>{ballotId === '+'? 'Add': 'Update'}</button>
					<button onClick={props.close}>Cancel</button>
				</ButtonRow>
			</Container>
		</AppModal>
	)
}

BallotDetail.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	ballotId: PropTypes.string.isRequired,
	epollNum: PropTypes.string,
	ballotsValid: PropTypes.bool.isRequired,
	ballots: PropTypes.array.isRequired,
	projectList: PropTypes.array.isRequired,
	ballotList: PropTypes.array.isRequired,
	votingPoolsValid: PropTypes.bool.isRequired,
	votingPools: PropTypes.array.isRequired,
	epolls: PropTypes.array.isRequired,
}

export default connect(
	(state, ownProps) => {
		const {ballots, votingPools, epolls} = state
		return {
			ballotsValid: ballots.valid,
			ballots: ballots.ballots,
			loading: ballots.loading,
			projectList: getProjectList(state),
			ballotList: getBallotList(state),
			votingPoolsValid: votingPools.valid,
			votingPools: votingPools.votingPools,
			epolls: epolls.epolls,
		}
	},
	(dispatch, ownProps) => {
		return {
			getBallots: () => dispatch(getBallots()),
			getVotingPools: () => dispatch(getVotingPools()),
			addBallot: (ballot) => dispatch(addBallot(ballot)),
			setProject: (project) => dispatch(setProject(project)),
			updateBallot: (ballotId, ballot) => dispatch(updateBallot(ballotId, ballot)),
			deleteResults: (ballotId) => dispatch(deleteResults(ballotId)),
			importResults: (ballotId, epollNum) => dispatch(importResults(ballotId, epollNum)),
			uploadResults: (ballotId, ballotType, file) => dispatch(uploadResults(ballotId, ballotType, file)),
			deleteComments: (ballotId) => dispatch(deleteComments(ballotId)),
			importComments: (ballotId, epollNum) => dispatch(importComments(ballotId, epollNum, 1)),
			uploadComments: (ballotId, ballotType, file) => dispatch(uploadComments(ballotId, ballotType, file)),
			setStartCommentId: (ballotId, startCommentId) => dispatch(setStartCommentId(ballotId, startCommentId))
		}
	}
)(BallotDetail)

