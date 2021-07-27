import PropTypes from 'prop-types'
import React from 'react'
import {connect, useDispatch} from 'react-redux'
import styled from '@emotion/styled'
import {shallowDiff} from 'dot11-components/lib/utils'
import {Form, Row, Col, Field, FieldLeft, List, ListItem, Checkbox, Input, Select, TextArea} from 'dot11-components/general/Form'
import {Button, ActionButton} from 'dot11-components/lib/icons'
import {ConfirmModal} from 'dot11-components/modals'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'
import {getData, getEntities} from 'dot11-components/store/dataSelectors'
import {setProperty} from 'dot11-components/store/ui'

import {renderResultsSummary, renderCommentsSummary} from './Ballots'

import {updateBallot, addBallot, deleteBallots, loadBallots, setProject, getProjectList, getBallotList, BallotType} from '../store/ballots'
import {loadVotingPools} from '../store/votingPools'
import {importResults, uploadEpollResults, uploadMyProjectResults, deleteResults} from '../store/results'
import {importComments, uploadComments, deleteComments, setStartCommentId} from '../store/comments'

function getDefaultBallot() {
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
		PrevBallotID: ''
	}
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

function SelectProject({width, project, projectList, onChange, readOnly}) {
	const options = projectList.map(p => ({value: p, label: p}))
	const value = options.find(o => o.value === project)
	return (
		<Select
			width={width}
			values={value? [value]: []}
			options={options}
			onChange={(values) => onChange(values.length > 0? values[0].value: '')}
			create
			clearable
			searchable
			dropdownPosition='auto'
			readOnly={readOnly}
		/>
	)
}

function SelectVotingPoolId({width, votingPoolId, votingPools, onChange, readOnly}) {
	const options = votingPools.map(i => ({value: i.VotingPoolID, label: i.VotingPoolID}))
	const value = options.find(o => o.value === votingPoolId)
	return (
		<Select
			width={width}
			values={value? [value]: []}
			options={options}
			onChange={(values) => onChange(values.length? values[0].value: '')}
			dropdownPosition='auto'
			readOnly={readOnly}
		/>
	)
}

function SelectPrevBallot({width, prevBallotId, ballotList, onChange, readOnly}) {
	const options = ballotList//.map(i => ({value: i.VotingPoolID, label: i.VotingPoolID}))
	const value = options.find(o => o.value === prevBallotId)
	return (
		<Select
			width={width}
			values={value? [value]: []}
			options={options}
			onChange={(values) => onChange(values.length? values[0].value: '')}
			dropdownPosition='auto'
			readOnly={readOnly}
		/>
	)
}

export function BallotTypes({value, onChange, readOnly}) {
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
					<Checkbox
						id={o.value}
						name='Type'
						value={o.value}
						checked={value === o.value}
						onChange={onChange}
						disabled={readOnly}
					/>
					<label htmlFor={o.value} >{o.label}</label>
				</ListItem>
			)}
		</List>
	)
}

const CommentsActions = ({ballot, readOnly}) => {
	const dispatch = useDispatch();
	const fileRef = React.useRef();
	const [startCID, setStartCID] = React.useState(ballot.Comments? ballot.Comments.CommentsIdMin: 1);

	async function handleDeleteComments() {
		const ok = await ConfirmModal.show(`Are you sure you want to delete comments for ${ballot.BallotID}?`)
		if (!ok)
			return;
		await dispatch(deleteComments(ballot.BallotID));
	}

	async function handleSetStartCID() {
		await dispatch(setStartCommentId(ballot.BallotID, startCID));
	}

	async function handleImportComments() {
		await dispatch(importComments(ballot.BallotID, ballot.EpollNum, 1));
	}

	async function handleUploadComments(file) {
		await dispatch(uploadComments(ballot.BallotID, ballot.Type, file));
	}

	console.log(ballot);
	return (
		<>
			<Row>
				<FieldLeft label='Comments:'>{renderCommentsSummary({rowData: ballot, dataKey: 'Comments'})}</FieldLeft>
			</Row>
			{!readOnly && <Row>
				<ListItem>
					<Button onClick={handleSetStartCID}>Change starting CID:&nbsp;</Button>
					<Input
						type='search'
						width={80}
						value={startCID || 1}
						onChange={e => setStartCID(e.target.value)}
					/>
				</ListItem>
				{ballot.Comments &&
					<Button
						onClick={handleDeleteComments}
					>
						Delete
					</Button>}
				{ballot.EpollNum &&
					<Button
						onClick={handleImportComments}
					>
						{(ballot.Comments? 'Reimport': 'Import') + ' from ePoll'}
					</Button>}
				<Button
					onClick={() => fileRef.current.click()}
				>
					Upload comments
				</Button>
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={fileRef}
					onChange={e => {if (e.target.files) handleUploadComments(e.target.files[0])}}
					style={{display: "none"}}
				/>
			</Row>}
		</>
	)
}

const ResultsActions = ({ballot, readOnly}) => {

	const dispatch = useDispatch();
	const fileRef = React.useRef();

	async function handleDeleteResults() {
		const ok = await ConfirmModal.show(`Are you sure you want to delete results for ${ballot.BallotID}?`)
		if (!ok)
			return;
		await dispatch(deleteResults(ballot.BallotID, ballot));
	}

	async function handleImportResults() {
		await dispatch(importResults(ballot.BallotID, ballot.EpollNum));
	}

	async function handleUploadResults(file) {
		if (ballot.Type === BallotType.SA_Initial ||
			ballot.Type === BallotType.SA_Recirc)
			await dispatch(uploadMyProjectResults(ballot.BallotID, file));
		else
			await dispatch(uploadEpollResults(ballot.BallotID, file));
	}

	return (
		<>
			<Row>
				<FieldLeft label='Results:'>{renderResultsSummary({rowData: ballot, dataKey: 'Results'})}</FieldLeft>
			</Row>
			{!readOnly && <Row>
				<Button
					onClick={handleDeleteResults}
				>
					Delete
				</Button>
				{ballot.EpollNum &&
					<Button
						onClick={handleImportResults}
					>
						{(ballot.Results? 'Reimport': 'Import') + ' from ePoll'}
					</Button>}
				<Button
					onClick={() => fileRef.current.click()}
				>
					Upload results
				</Button>
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={fileRef}
					onChange={e => {
						if (e.target.files) {
							handleUploadResults(e.target.files[0]);
						}
					}}
					style={{display: "none"}}
				/>
			</Row>}
		</>
	)
}

const TopicTextArea = styled(TextArea)`
	flex: 1;
	height: 3.5em;
`;

export function Column1({
	project,
	setProject,
	projectList,
	ballot,
	setBallot,
	ballotList,
	votingPools,
	readOnly
}) {
	const change = (e) => {
		const {name, value} = e.target;
		setBallot({...ballot, [name]: value});
	}
	const changeProject = (project) => {
		if (ballot.Project !== project) {
			setProject(project)
			setBallot(ballot => ({...ballot, Project: project}))
		}
	}
	const changeDate = (e) => {
		const {name, value} = e.target;
		const dateStr = shortDateToDate(value);
		setBallot(ballot => ({...ballot, [name]: dateStr}));
	}
	return (
		<>
			<Field label='Project:'>
				<SelectProject
					width={150}
					project={ballot.Project}
					projectList={projectList}
					onChange={changeProject}
					readOnly={readOnly}
				/>
			</Field>
			<Field label='Ballot ID:'>
				<Input type='search'
					name='BallotID'
					value={ballot.BallotID}
					onChange={change}
					disabled={readOnly}
				/>
			</Field>
			{(ballot.Type !== BallotType.SA_Initial && ballot.Type !== BallotType.SA_Recirc) &&
				<Field label='ePoll Number:'>
					<Input type='search'
						name='EpollNum'
						value={ballot.EpollNum}
						onChange={change}
						disabled={readOnly}
					/>
				</Field>}
			<Field label='Document:'>
				<Input type='search'
					name='Document'
					value={ballot.Document}
					onChange={change}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Topic:'>
				<TopicTextArea 
					name='Topic'
					value={ballot.Topic}
					onChange={change}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Start:'>
				<Input type='date'
					name='Start'
					value={dateToShortDate(ballot.Start)}
					onChange={changeDate}
					disabled={readOnly}
				/>
			</Field>
			<Field label='End:'>
				<Input type='date'
					name='End'
					value={dateToShortDate(ballot.End)}
					onChange={changeDate}
					disabled={readOnly}
				/>
			</Field>
			{(ballot.Type === BallotType.WG_Initial || ballot.Type === BallotType.SA_Initial || ballot.Type === BallotType.Motion) &&
				<Field label='Voter Pool:'>
					<SelectVotingPoolId 
						votingPoolId={ballot.VotingPoolID}
						votingPools={votingPools}
						onChange={value => setBallot(ballot => ({...ballot, VotingPoolID: value}))}
						width={150}
						readOnly={readOnly}
					/>
				</Field>}
			{(ballot.Type === BallotType.WG_Recirc || ballot.Type === BallotType.SA_Recirc) &&
				<Field label='Previous Ballot:'>
					<SelectPrevBallot
						prevBallotId={ballot.PrevBallotID}
						ballotList={ballotList}
						onChange={value => setBallot(ballot => ({...ballot, PrevBallotID: value}))}
						width={150}
						readOnly={readOnly}
					/>
				</Field>}
		</>
	)
}

const BallotContainer = styled.div`
	label {
		font-weight: bold;
	}
`;

function Ballot({
	project,
	setProject,
	projectList,
	ballot,
	setBallot,
	ballotList,
	votingPools,
	readOnly
}) {
	function changeType(e) {
		const {name, value} = e.target;
		setBallot(ballot => ({...ballot, [name]: parseInt(value, 10)}))
	}

	return (
		<BallotContainer>
			<Row>
				<Col>
					<Column1
						project={project}
						setProject={setProject}
						projectList={projectList}
						ballot={ballot}
						setBallot={setBallot}
						ballotList={ballotList}
						votingPools={votingPools}
						readOnly={readOnly}
					/>
				</Col>
				<Col>
					<BallotTypes
						value={ballot.Type}
						onChange={changeType}
						readOnly={readOnly}
					/>
					<Field label='Series complete:'>
						<Checkbox
							checked={!!ballot.IsComplete}
							onChange={e => setBallot(ballot => ({...ballot, IsComplete: e.target.checked}))}
						/>
					</Field>
				</Col>
			</Row>
			<ResultsActions
				ballot={ballot}
				readOnly={readOnly}
			/>
			<CommentsActions 
				ballot={ballot}
				readOnly={readOnly}
			/>
		</BallotContainer>
	)
}

const Action = {
	NONE: null,
	REMOVE: 'remove',
	IMPORT_FROM_EPOLL: 'import_from_epoll',
	IMPORT_FROM_FILE: 'import_from_file',
	SET_START_CID: 'set_start_CID'
}

const BallotDetailContainer = styled.div`
	padding: 10px;
	label {
		font-weight: bold;
	}
`;

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`;

const NotAvaialble = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;
/*
 * Ballot detail is mounted from
 * The ballotId parameter is '+' to add a new ballot or a ballot ID to update a ballot
 * If the ballotId parameter is '+' and epollNum is provided, then the ballot fields are filled in from the epoll data
 */
function _BallotDetail({
	ballotId,
	ballots,
	ballotsValid,
	loading,
	loadBallots,
	updateBallot,
	deleteBallots,
	projectList,
	ballotList,
	votingPoolsValid,
	votingPools,
	getVotingPools,
	uiProperty,
	setUiProperty,
	readOnly
}) {
	const [ballot, setBallot] = React.useState(getDefaultBallot);
	const [resultsAction, setResultsAction] = React.useState(Action.NONE);
	const [resultsFile, setResultsFile] = React.useState('');
	const [commentsAction, setCommentsAction] = React.useState(Action.NONE);
	const [commentsFile, setCommentsFile] = React.useState(null);
	const [startCID, setStartCID] = React.useState('');
	const [busy, setBusy] = React.useState(false);

	/* On mount, make sure we have the ballots and voting pools loaded */
	React.useEffect(() => {
		if (!ballotsValid)
			loadBallots();
		if (!votingPoolsValid)
			loadVotingPools();
	}, []);

	/* On mount or if the underlying data changes,
	 * reload the ballot from ballot data or epoll data as appropriate. */
	React.useEffect(() => {
		if (ballotId) {
			const b = ballots.find(b => b.BallotID === ballotId)
			if (b) {
				setBallot(b)
				setStartCID(b.Comments? b.Comments.CommentIDMin: 0)
			}
		}
	}, [ballotId, ballots]);

	/* All the database manipulation functions are asynchornous. They need to be issued in the right order
	 * but don't need to complete until the next is started. */
	async function submit() {
		setBusy(true)
		const b = ballots.find(b => b.BallotID === ballotId)
		if (b) {
			let changed = shallowDiff(b, ballot)
			if (Object.keys(changed).length) {
				changed.id = b.id;
				await updateBallot(ballotId, changed)
			}
		}
	}

	async function handleDeleteBallot() {
		const ok = await ConfirmModal.show(`Are you sure you want to delete ballot ${ballot.BallotID}?`)
		if (!ok)
			return;
		await deleteBallots([ballot]);
	}

	let notAvailableStr
	if (loading) {
		notAvailableStr = 'Loading...'
	}
	else if (!ballotId) {
		notAvailableStr = 'Nothing selected'
	}
	const disableButtons = !!notAvailableStr 	// disable buttons if displaying string

	return (
		<BallotDetailContainer>
			<TopRow>
				<span></span>
				{!readOnly &&
					<span>
						<ActionButton
							name='edit'
							title='Edit ballot'
							disabled={disableButtons}
							isActive={uiProperty.editBallot}
							onClick={() => setUiProperty('editBallot', !uiProperty.editBallot)}
						/>
						<ActionButton
							name='delete'
							title='Delete ballot'
							disabled={disableButtons}
							onClick={handleDeleteBallot}
						/>
					</span>
				}
			</TopRow>
			{notAvailableStr?
				<NotAvaialble>
					<span>{notAvailableStr}</span>
			 	</NotAvaialble>:
				<Ballot 
					ballot={ballot}
					setBallot={setBallot}
					projectList={projectList}
					ballotList={ballotList}
					votingPools={votingPools}
					readOnly={readOnly || !uiProperty.editBallot}
				/>
			}
		</BallotDetailContainer>
	)
}

_BallotDetail.propTypes = {
	ballotId: PropTypes.string.isRequired,
	ballotsValid: PropTypes.bool.isRequired,
	ballots: PropTypes.array.isRequired,
	projectList: PropTypes.array.isRequired,
	ballotList: PropTypes.array.isRequired,
	votingPoolsValid: PropTypes.bool.isRequired,
	votingPools: PropTypes.array.isRequired,
	updateBallot: PropTypes.func.isRequired,
	deleteBallots: PropTypes.func.isRequired,
	setUiProperty: PropTypes.func.isRequired,
}

const BallotDetail = connect(
	(state) => {
		const {ballots, votingPools} = state
		return {
			ballotsValid: ballots.valid,
			ballots: getData(state, 'ballots'),
			loading: ballots.loading,
			projectList: getProjectList(state),
			ballotList: getBallotList(state),
			votingPoolsValid: votingPools.valid,
			votingPools: getData(state, 'votingPools'),
			epolls: state.epolls.entities,
			uiProperty: state.ballots.ui,
		}
	},
	(dispatch) => {
		return {
			loadBallots: () => dispatch(loadBallots()),
			loadVotingPools: () => dispatch(loadVotingPools()),
			addBallot: (ballot) => dispatch(addBallot(ballot)),
			setProject: (project) => dispatch(setProject(project)),
			updateBallot: (ballotId, ballot) => dispatch(updateBallot(ballotId, ballot)),
			deleteBallots: (ballot) => dispatch(deleteBallots(ballot)),
			setUiProperty: (property, value) => dispatch(setProperty('ballots', property, value))
		}
	}
)(_BallotDetail)

const StyledForm = styled(Form)`
	width: 700px;
`;

function _BallotAddForm({
	defaultBallot,
	project,
	projectList,
	ballotList,
	votingPools,
	addBallot,
	setProject,
	close
}) {
	const [ballot, setBallot] = React.useState(defaultBallot || getDefaultBallot());
	const [errMsg, setErrMsg] = React.useState('');
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		setBusy(true);
		await addBallot(ballot);
		setBusy(false);
		close();
	}

	const changeType = (e) => {
		const {name, value} = e.target;
		setBallot(ballot => ({...ballot, [name]: parseInt(value, 10)}));
	}

	return (
		<StyledForm
			title='Add ballot'
			submit={submit}
			submitText='Add'
			cancel={close}
			busy={busy}
		>
			<Row>
				<Col>
					<Column1
						project={project}
						setProject={setProject}
						projectList={projectList}
						ballot={ballot}
						setBallot={setBallot}
						ballotList={ballotList}
						votingPools={votingPools}
					/>
				</Col>
				<Col>
					<BallotTypes
						value={ballot.Type}
						onChange={changeType}
					/>
				</Col>
			</Row>
		</StyledForm>
	)
}

_BallotAddForm.propTypes = {
	addBallot: PropTypes.func.isRequired,
	close: PropTypes.func.isRequired,
}

const BallotAddForm = connect(
	(state) => ({
		projectList: getProjectList(state),
		ballotList: getBallotList(state),
		votingPools: getData(state, 'votingPools'),
	}),
	{addBallot, setProject}
)(_BallotAddForm)

const BallotAdd = () => 
	<ActionButtonDropdown
		name='add'
		title='Add ballot' 
	>
		<BallotAddForm />
	</ActionButtonDropdown>

export default BallotDetail;
export {BallotAdd}
