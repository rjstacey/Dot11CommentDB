import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import Select from 'react-dropdown-select'
import AppModal from '../modals/AppModal'
import {Form, Row, Col, Field, List, ListItem} from '../general/Form'
import ConfirmModal from '../modals/ConfirmModal'
import {Checkbox, Search} from '../general/Icons'
import {renderResultsSummary, renderCommentsSummary} from './Ballots'
import {updateBallot, addBallot, getBallots, setProject, BallotType} from '../actions/ballots'
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

const StyledSelect = styled(Select)`
	min-height: unset;
	padding: unset;
	width: unset;
	flex: 1 1 ${({width}) => width}px;
`;

function SelectProject({width, project, projectList, onChange}) {
	const options = projectList.map(p => ({value: p, label: p}))
	const value = options.find(o => o.value === project)
	return (
		<StyledSelect
			width={width}
			values={value? [value]: []}
			options={options}
			onChange={(values) => onChange(values.length > 0? values[0].value: '')}
			create
			clearable
			searchable
			dropdownPosition='auto'
		/>
	)
}

function SelectVotingPoolId({width, votingPoolId, votingPools, onChange}) {
	const options = votingPools.map(i => ({value: i.VotingPoolID, label: i.VotingPoolID}))
	const value = options.find(o => o.value === votingPoolId)
	return (
		<StyledSelect
			width={width}
			values={value? [value]: []}
			options={options}
			onChange={(values) => onChange(values.length? values[0].value: '')}
			dropdownPosition='auto'
		/>
	)
}

function SelectPrevBallot({width, prevBallotId, ballotList, onChange}) {
	const options = ballotList//.map(i => ({value: i.VotingPoolID, label: i.VotingPoolID}))
	const value = options.find(o => o.value === prevBallotId)
	return (
		<StyledSelect
			width={width}
			values={value? [value]: []}
			options={options}
			onChange={(values) => onChange(values.length? values[0].value: '')}
			dropdownPosition='auto'
		/>
	)
}

function BallotTypes({value, onChange}) {
	const ballotTypeOptions = [
		{value: BallotType.CC, label: 'Comment collection'},
		{value: BallotType.WG_Initial, label: 'Initial WG ballot'},
		{value: BallotType.WG_Recirc, label: 'Recirc WG ballot'},
		{value: BallotType.SA_Initial, label: 'Initial SA ballot'},
		{value: BallotType.SA_Recirc, label: 'Recirc SA ballot'},
		{value: BallotType.Motion, label: 'Motion'}
	];
	return (
		<List
			label='Ballot Type:'
		>
			{ballotTypeOptions.map((o) => 
				<ListItem key={o.value}>
					<input
						id={'radio_' + o.value}
						type='radio' name='Type'
						value={o.value}
						checked={value === o.value}
						onChange={onChange}
					/>
					<label htmlFor={'radio_'+ o.value} >{o.label}</label>
				</ListItem>
			)}
		</List>
	)
}

const CommentsActions = ({action, setAction, ballot, file, setFile, startCID, setStartCID}) => {
	const fileRef = React.useRef();
	return (
		<List>
			<label>Comments: {renderCommentsSummary({rowData: ballot, key: 'Comments'})}</label>
			<ListItem>
				<Checkbox
					id='start'
					checked={action === Action.SET_START_CID}
					onChange={e => setAction(action !== Action.SET_START_CID? Action.SET_START_CID: Action.NONE)}
				/>
				<label htmlFor='start'>Change starting CID:&nbsp;</label>
				<Search
					width={80}
					value={startCID || 1}
					onChange={e => setStartCID(e.target.value)}
				/>
			</ListItem>
			{ballot.Comments &&
				<ListItem>
					<Checkbox
						id='delete'
						checked={action === Action.REMOVE}
						onChange={e => setAction(action !== Action.REMOVE? Action.REMOVE: Action.NONE)}
					/>
					<label htmlFor='delete'>Delete</label>
				</ListItem>
			}
			{ballot.EpollNum &&
				<ListItem>
					<Checkbox
						id='importFromEpoll'
						checked={action === Action.IMPORT_FROM_EPOLL}
						onChange={e => setAction(action !== Action.IMPORT_FROM_EPOLL? Action.IMPORT_FROM_EPOLL: Action.NONE)}
					/>
					<label htmlFor='importFromEpoll'>{(ballot.Comments? 'Reimport': 'Import') + ' from ePoll'}</label>
				</ListItem>
			}
			<ListItem>
				<Checkbox
					id='file'
					checked={action === Action.IMPORT_FROM_FILE}
					onChange={e => action !== Action.IMPORT_FROM_FILE? fileRef.current.click(): setAction(Action.NONE)}
				/>
				<label htmlFor='file'>{'Upload from ' + (file? file.name: 'file')}</label>
			</ListItem>
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
		</List>
	)
}

const ResultsActions = ({action, setAction, ballot, file, setFile}) => {
	const fileRef = React.useRef();
	return (
		<List>
			<label>Results: {renderResultsSummary({rowData: ballot, key: 'Results'})}</label>
			<ListItem>
				<Checkbox
					id='delete'
					checked={action === Action.REMOVE}
					onChange={e => setAction(action !== Action.REMOVE? Action.REMOVE: Action.NONE)}
				/>
				<label htmlFor='delete'>Delete</label>
			</ListItem>
			{ballot.EpollNum &&
				<ListItem>
					<Checkbox
						id='importFromEpoll'
						checked={action === Action.IMPORT_FROM_EPOLL}
						onChange={e => setAction(action !== Action.IMPORT_FROM_EPOLL? Action.IMPORT_FROM_EPOLL: Action.NONE)}
					/>
					<label htmlFor='importFromEpoll'>{(ballot.Results? 'Reimport': 'Import') + ' from ePoll'}</label>
				</ListItem>}
			<ListItem>
				<Checkbox
					id='fromFile'
					checked={action === Action.IMPORT_FROM_FILE}
					onChange={e => action !== Action.IMPORT_FROM_FILE? fileRef.current.click(): setAction(Action.NONE)}
				/>
				<label htmlFor='fromFile'>{'Upload from ' + (file? file.name: 'file')}</label>
			</ListItem>
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
		</List>
	)
}

const TextArea = styled.textarea`
	font-family: inherit;
	font-size: unset;
	flex: 1;
	height: 3.5em;
`;

function Column1({project, setProject, projectList, ballot, setBallot, ballotList, votingPools}) {
	const change = (e) => {
		const {name, value} = e.target;
		setBallot({...ballot, [name]: value});
	}
	const changeProject = (project) => {
		//const project = values.length > 0? values[0].value: ''
		setProject(project)
		setBallot(ballot => ({...ballot, Project: project}))
	}
	const changeDate = (e) => {
		const {name, value} = e.target;
		const dateStr = shortDateToDate(value);
		setBallot(ballot => ({...ballot, [name]: dateStr}));
	}
	return (
		<React.Fragment>
			<Field label='Project:'>
				<SelectProject
					width={150}
					project={ballot.Project}
					projectList={projectList}
					onChange={changeProject}
				/>
			</Field>
			<Field label='Ballot ID:'>
				<Search name='BallotID' value={ballot.BallotID} onChange={change} />
			</Field>
			{(ballot.Type !== BallotType.SA_Initial && ballot.Type !== BallotType.SA_Recirc) &&
				<Field label='ePoll Number:'>
					<Search name='EpollNum' value={ballot.EpollNum} onChange={change} />
				</Field>}
			<Field label='Document:'>
				<Search name='Document' value={ballot.Document} onChange={change}/>
			</Field>
			<Field label='Topic:'>
				<TextArea name='Topic' value={ballot.Topic} onChange={change} />
			</Field>
			<Field label='Start:'>
				<input type='date' name='Start' value={dateToShortDate(ballot.Start)} onChange={changeDate} />
			</Field>
			<Field label='End:'>
				<input type='date' name='End' value={dateToShortDate(ballot.End)} onChange={changeDate} />
			</Field>
			{(ballot.Type === BallotType.WG_Initial || ballot.Type === BallotType.SA_Initial || ballot.Type === BallotType.Motion) &&
				<Field label='Voter Pool:'>
					<SelectVotingPoolId 
						votingPoolId={ballot.VotingPoolID}
						votingPools={votingPools}
						onChange={value => setBallot(ballot => ({...ballot, VotingPoolID: value}))}
						width={150}
					/>
				</Field>}
			{(ballot.Type === BallotType.WG_Recirc || ballot.Type === BallotType.SA_Recirc) &&
				<Field label='Previous Ballot:'>
					<SelectPrevBallot
						prevBallotId={ballot.PrevBallotID}
						ballotList={ballotList}
						onChange={value => setBallot(ballot => ({...ballot, PrevBallotID: value}))}
						width={150}
					/>
				</Field>}
		</React.Fragment>
	)
}

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
function _BallotDetailForm(props) {
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

	function changeType(e) {
		const {name, value} = e.target;
		setBallot(ballot => ({...ballot, [name]: parseInt(value, 10)}))
	}

	/* All the database manipulation functions are asynchornous. They need to be issued in the right order
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

	return (
		<Form
			title={ballotId === '+'? 'Add ballot': `Edit ballot ${ballotId}`}
			submit={submit}
			submitText={ballotId === '+'? 'Add': 'Update'}
			cancel={props.close}
		>
			<Row>
				<Col>
					<Column1
						project={props.project}
						setProject={props.setProject}
						projectList={props.projectList}
						ballot={ballot}
						setBallot={setBallot}
						ballotList={props.ballotList}
						votingPools={props.votingPools}
					/>
				</Col>
				<Col>
					<BallotTypes
						value={ballot.Type}
						onChange={changeType}
					/>
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
				</Col>
			</Row>
		</Form>
	)
}

_BallotDetailForm.propTypes = {
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

const BallotDetailForm = connect(
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
)(_BallotDetailForm)

function BallotDetailModal({
	isOpen,
	close,
	ballotId,
	epollNum
}) {
	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<BallotDetailForm 
				isOpen={isOpen}
				close={close}
				ballotId={ballotId}
				epollNum={epollNum}
			/>
		</AppModal>
	)
}

export default BallotDetailModal;