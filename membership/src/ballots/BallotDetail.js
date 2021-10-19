import PropTypes from 'prop-types'
import React from 'react'
import {connect, useDispatch, useSelector} from 'react-redux'
import styled from '@emotion/styled'
import {shallowDiff, recursivelyDiffObjects, isMultiple, debounce} from 'dot11-components/lib'
import {Form, Row, Col, Field, FieldLeft, List, ListItem, Checkbox, Input, Select, TextArea} from 'dot11-components/general/Form'
import {Button, ActionButton} from 'dot11-components/icons'
import {ActionButtonModal, ConfirmModal} from 'dot11-components/modals'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'
import {getData, getEntities} from 'dot11-components/store/dataSelectors'
import {setProperty} from 'dot11-components/store/ui'

import {renderResultsSummary, renderCommentsSummary} from './Ballots'

import {updateBallot, addBallot, deleteBallots, loadBallots, setProject, getProjectList, getBallotList, makeGetBallotList, 
	BallotType, BallotTypeOptions, BallotStage, BallotStageOptions} from '../store/ballots'
import {loadVotingPools} from '../store/votingPools'
import {importResults, uploadEpollResults, uploadMyProjectResults, deleteResults} from '../store/results'
import {importComments, uploadComments, deleteComments, setStartCommentId} from '../store/comments'

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

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

function SelectProject({value, onChange, ...otherProps}) {
	const projectList = useSelector(getProjectList);
	const options = projectList.map(p => ({value: p, label: p}))
	const optionSelected = options.find(o => o.value === value)
	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			options={options}
			onChange={(values) => onChange(values.length > 0? values[0].value: '')}
			create
			clearable
			searchable
			dropdownPosition='auto'
			{...otherProps}
		/>
	)
}

function SelectVotingPoolId({value, options, onChange, ...otherProps}) {
	const optionSelected = options.find(o => o.value === value);
	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			options={options}
			onChange={(values) => onChange(values.length? values[0].value: '')}
			dropdownPosition='auto'
			{...otherProps}
		/>
	)
}

function SelectPrevBallot({value, ballot, onChange, ...otherProps}) {
	const ballots = useSelector(state => state.ballots.entities);
	const options = React.useMemo(() => {
		const list = [];
		for (const b of Object.values(ballots)) {
			if (b.Project === ballot.Project && b.Start < ballot.Start)
				list.push(b.BallotID);
		}
		list.sort();
		return list.map(ballotId => ({value: ballotId, label: ballotId}));
	}, [ballot, ballots]);
	const optionSelected = options.find(o => o.value === value);
	return (
		<Select
			values={optionSelected? [optionSelected]: []}
			options={options}
			onChange={(values) => onChange(values.length? values[0].value: '')}
			dropdownPosition='auto'
			{...otherProps}
		/>
	)
}

export const BallotTypeSelect = ({value, onChange, readOnly}) =>
	<List
		label='Ballot Type:'
	>
		{BallotTypeOptions.map((o) => 
			<ListItem key={o.value}>
				<Checkbox
					id={o.value}
					name='Type'
					value={o.value}
					checked={value === o.value}
					indeterminate={isMultiple(value)}
					onChange={e => onChange(e.target.value)}
					disabled={readOnly}
				/>
				<label htmlFor={o.value} >{o.label}</label>
			</ListItem>
		)}
	</List>

export const BallotStageSelect = ({value, onChange, readOnly}) =>
	<List
		label='Ballot stage:'
	>
		{BallotStageOptions.map((o) => 
			<ListItem key={o.value}>
				<Checkbox
					id={o.value}
					name='Stage'
					value={o.value}
					checked={value === o.value}
					indeterminate={isMultiple(value)}
					onChange={e => onChange(e.target.value)}
					disabled={readOnly}
				/>
				<label htmlFor={o.value} >{o.label}</label>
			</ListItem>
		)}
	</List>

const ChangeStartCID = ({close, ballot}) => {
	const dispatch = useDispatch();
	const [startCID, setStartCID] = React.useState(ballot.Comments? ballot.Comments.CommentIDMin: 1);
	const [busy, setBusy] = React.useState(false);

	const handleSetStartCID = async () => {
		setBusy(true);
		await dispatch(setStartCommentId(ballot.BallotID, startCID));
		setBusy(false);
		close();
	}

	return (
		<Form
			title='Change starting CID'
			submit={handleSetStartCID}
			cancel={close}
			busy={busy}
		>
			<Input
				type='search'
				width={80}
				value={startCID}
				onChange={e => setStartCID(e.target.value)}
			/>
		</Form>
	)
}

const CommentsActions = ({multiple, ballot, readOnly}) => {
	const dispatch = useDispatch();
	const fileRef = React.useRef();

	async function handleDeleteComments() {
		const ok = await ConfirmModal.show(`Are you sure you want to delete comments for ${ballot.BallotID}?`)
		if (!ok)
			return;
		await dispatch(deleteComments(ballot.BallotID));
	}

	async function handleImportComments() {
		await dispatch(importComments(ballot.BallotID, ballot.EpollNum, 1));
	}

	async function handleUploadComments(file) {
		await dispatch(uploadComments(ballot.BallotID, ballot.Type, file));
	}

	return <>
		<Row>
			<FieldLeft label='Comments:'>
				{multiple? MULTIPLE_STR: renderCommentsSummary({rowData: ballot, dataKey: 'Comments'})}
			</FieldLeft>
		</Row>
		{!readOnly && <Row style={{justifyContent: 'flex-left'}}>
			<ActionButtonModal 
				label='Change starting CID'
			>
				<ChangeStartCID ballot={ballot} />
			</ActionButtonModal>
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
}

const ResultsActions = ({multiple, ballot, readOnly}) => {

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
		if (ballot.Type === BallotType.SA)
			await dispatch(uploadMyProjectResults(ballot.BallotID, file));
		else
			await dispatch(uploadEpollResults(ballot.BallotID, file));
	}

	return (
		<>
			<Row>
				<FieldLeft label='Results:'>
					{multiple? MULTIPLE_STR: renderResultsSummary({rowData: ballot, dataKey: 'Results'})}
				</FieldLeft>
			</Row>
			{!readOnly && <Row style={{justifyContent: 'flex-left'}}>
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
	multiple,
	ballot,
	updateBallot,
	setProject,
	projectList,
	ballotList,
	votingPools,
	readOnly
}) {
	const change = (e) => {
		const {name, value} = e.target;
		updateBallot({[name]: value});
	}
	const changeProject = (project) => {
		if (ballot.Project !== project) {
			setProject(project);
			updateBallot({Project: project});
		}
	}
	const changeDate = (e) => {
		const {name, value} = e.target;
		const dateStr = shortDateToDate(value);
		updateBallot({[name]: dateStr});
	}
	return <>
		<Row>
			<Field label='Project:'>
				<SelectProject
					style={{minWidth: 150}}
					value={isMultiple(ballot.Project)? null: ballot.Project}
					onChange={changeProject}
					placeholder={isMultiple(ballot.Project)? MULTIPLE_STR: BLANK_STR}
					readOnly={readOnly}
				/>
			</Field>
		</Row>
		<Row>
			<Field label='Ballot ID:'>
				<Input type='search'
					name='BallotID'
					value={isMultiple(ballot.BallotID)? '': ballot.BallotID}
					onChange={change}
					placeholder={isMultiple(ballot.BallotID)? MULTIPLE_STR: BLANK_STR}
					disabled={readOnly || multiple}
				/>
			</Field>
		</Row>
		{ballot.Type !== BallotType.SA &&
			<Row>
				<Field label='ePoll number:'>
					<Input type='search'
						name='EpollNum'
						value={isMultiple(ballot.EpollNum)? '': ballot.EpollNum}
						onChange={change}
						placeholder={isMultiple(ballot.BallotID)? MULTIPLE_STR: BLANK_STR}
						disabled={readOnly || multiple}
					/>
				</Field>
			</Row>}
		<Row>
			<Field label='Document:'>
				<Input type='search'
					name='Document'
					value={isMultiple(ballot.Document)? '': ballot.Document}
					placeholder={isMultiple(ballot.Document)? MULTIPLE_STR: BLANK_STR}
					onChange={change}
					disabled={readOnly}
				/>
			</Field>
		</Row>
		<Row>
			<Field label='Topic:'>
				<TopicTextArea 
					name='Topic'
					value={isMultiple(ballot.Topic)? '': ballot.Topic}
					placeholder={isMultiple(ballot.Topic)? MULTIPLE_STR: BLANK_STR}
					onChange={change}
					disabled={readOnly}
				/>
			</Field>
		</Row>
		<Row>
			<Field label='Start:'>
				<Input type='date'
					name='Start'
					value={isMultiple(ballot.Start)? '': dateToShortDate(ballot.Start)}
					onChange={changeDate}
					disabled={readOnly || multiple}
				/>
			</Field>
		</Row>
		<Row>
			<Field label='End:'>
				<Input type='date'
					name='End'
					value={isMultiple(ballot.End)? '': dateToShortDate(ballot.End)}
					onChange={changeDate}
					disabled={readOnly || multiple}
				/>
			</Field>
		</Row>
		{((ballot.Type === BallotType.WG && !ballot.IsRecirc) || ballot.Type === BallotType.Motion) &&
			<Row>
				<Field label='Voter pool:'>
					<SelectVotingPoolId 
						value={ballot.VotingPoolID}
						options={votingPools.map(i => ({value: i.VotingPoolID, label: i.VotingPoolID}))}
						onChange={value => updateBallot({VotingPoolID: value})}
						width={150}
						readOnly={readOnly}
					/>
				</Field>
			</Row>}
		{(ballot.Type === BallotType.WG || ballot.Type === BallotType.SA) && !!ballot.IsRecirc &&
			<Row>
				<Field label='Previous ballot:'>
					<SelectPrevBallot
						value={isMultiple(ballot.PrevBallotID)? null: ballot.PrevBallotID}
						ballot={ballot}
						placeholder={isMultiple(ballot.PrevBallotID)? MULTIPLE_STR: BLANK_STR}
						onChange={value => updateBallot({PrevBallotID: value})}
						width={150}
						readOnly={readOnly || multiple}
					/>
				</Field>
			</Row>}
	</>
}

Column1.propTypes = {
	multiple: PropTypes.bool,
	ballot: PropTypes.object.isRequired,
	updateBallot: PropTypes.func.isRequired,
	setProject: PropTypes.func.isRequired,
	projectList: PropTypes.array.isRequired,
	ballotList: PropTypes.array.isRequired,
	votingPools: PropTypes.array.isRequired,
	readOnly: PropTypes.bool
}

const BallotContainer = styled.div`
	label {
		font-weight: bold;
	}
`;

function Ballot({
	multiple,
	ballot,
	updateBallot,
	setProject,
	projectList,
	ballotList,
	votingPools,
	readOnly
}) {

	return (
		<BallotContainer>
			<Row>
				<Col>
					<Column1
						multiple={multiple}
						ballot={ballot}
						updateBallot={updateBallot}
						setProject={setProject}
						projectList={projectList}
						ballotList={ballotList}
						votingPools={votingPools}
						readOnly={readOnly}
					/>
				</Col>
				<Col>
					<BallotTypeSelect
						value={ballot.Type}
						onChange={value => updateBallot({Type: parseInt(value, 10)})}
						readOnly={readOnly}
					/>
					{(ballot.Type === BallotType.WG || ballot.Type === BallotType.SA) &&
						<>
							<BallotStageSelect
								value={ballot.IsRecirc}
								onChange={value => updateBallot({IsRecirc: parseInt(value, 10)})}
								readOnly={readOnly}
							/>
							<ListItem>
								<Checkbox
									id='IsComplete'
									checked={ballot.IsComplete}
									indeterminate={isMultiple(ballot.IsComplete)}
									onChange={e => updateBallot({IsComplete: e.target.checked})}
									disabled={readOnly}
								/>
								<label htmlFor='IsComplete' >Final in ballot series</label>
							</ListItem>
						</>}
				</Col>
			</Row>
			<ResultsActions
				multiple={multiple}
				ballot={ballot}
				readOnly={readOnly}
			/>
			<CommentsActions 
				multiple={multiple}
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

class _BallotDetail extends React.Component {
	constructor(props) {
		super(props)
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	componentDidMount() {
		if (!this.props.ballotsValid)
			this.props.loadBallots();
		if (!this.props.votingPoolsValid)
			this.props.loadVotingPools();
	}

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props) => {
		const {ballots, selected} = props;
		let diff = {}, originals = [];
		for (const id of selected) {
			const ballot = ballots[id];
			if (ballot) {
				diff = recursivelyDiffObjects(diff, ballot);
				originals.push(ballot);
			}
		}
		return {
			saved: diff,
			edited: diff,
			originals: originals
		};
	}

	updateBallot = (changes) => {
		const {readOnly, uiProperties} = this.props;
		if (readOnly || !uiProperties.edit) {
			console.warn("Update when read-only")
			return;
		}
		// merge in the edits and trigger a debounced save
		this.setState(
			state => ({...state, edited: {...state.edited, ...changes}}),
			this.triggerSave
		);
	}

	save = () => {
		const {edited, saved, originals} = this.state;
		const d = shallowDiff(saved, edited);
		const updates = [];
		for (const o of originals) {
			if (Object.keys(d).length > 0)
				updates.push({...d, id: o.id});
		}
		if (updates.length > 0)
			updates.forEach(u => this.props.updateBallot(u.id, u));
		this.setState(state => ({...state, saved: edited}));
	}

	handleRemoveSelected = async () => {
		const {selected} = this.props;
		const ok = await ConfirmModal.show(`Are you sure you want to delete ballots ${selected}?`);
		if (!ok)
			return;
		await deleteBallots(selected);
	}

	render() {
		const {style, className, loading, uiProperties, setUiProperty, readOnly, ballots, selected, 
			votingPools, setProject, ballotList, projectList} = this.props;

		let notAvailableStr
		if (loading)
			notAvailableStr = 'Loading...';
		else if (this.state.originals.length === 0)
			notAvailableStr = 'Nothing selected';
		const disableButtons = !!notAvailableStr; 	// disable buttons if displaying string

		return (
			<BallotDetailContainer
				style={style}
				className={className}
			>
				<TopRow>
					<span></span>
					{!readOnly &&
						<span>
							<ActionButton
								name='edit'
								title='Edit ballot'
								disabled={disableButtons}
								isActive={uiProperties.edit}
								onClick={() => setUiProperty('edit', !uiProperties.edit)}
							/>
							<ActionButton
								name='delete'
								title='Delete ballot'
								disabled={disableButtons}
								onClick={this.handleRemoveSelected}
							/>
						</span>
					}
				</TopRow>
				{notAvailableStr?
					<NotAvaialble>
						<span>{notAvailableStr}</span>
				 	</NotAvaialble>:
					<Ballot 
						multiple={this.state.originals.length > 1}
						ballot={this.state.edited}
						updateBallot={this.updateBallot}
						setProject={setProject}
						projectList={projectList}
						ballotList={ballotList}
						votingPools={votingPools}
						readOnly={readOnly || !uiProperties.edit}
					/>
				}
			</BallotDetailContainer>
		)
	}

	static propTypes = {
		ballotsValid: PropTypes.bool.isRequired,
		ballots: PropTypes.object.isRequired,
		projectList: PropTypes.array.isRequired,
		ballotList: PropTypes.array.isRequired,
		votingPoolsValid: PropTypes.bool.isRequired,
		votingPools: PropTypes.array.isRequired,
		setProject: PropTypes.func.isRequired,
		updateBallot: PropTypes.func.isRequired,
		deleteBallots: PropTypes.func.isRequired,
		setUiProperty: PropTypes.func.isRequired,
	}
}

const BallotDetail = connect(
	(state) => {
		const {ballots, votingPools} = state
		return {
			ballotsValid: ballots.valid,
			ballots: getEntities(state, 'ballots'),
			loading: ballots.loading,
			projectList: getProjectList(state),
			ballotList: getBallotList(state),
			votingPoolsValid: votingPools.valid,
			votingPools: getData(state, 'votingPools'),
			selected: state.ballots.selected,
			uiProperties: state.ballots.ui,
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
)(_BallotDetail);

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

	const updateBallot = (changes) => setBallot(ballot => ({...ballot, ...changes}));

	return (
		<Form
			style={{width: '700px'}}
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
						updateBallot={updateBallot}
						ballotList={ballotList}
						votingPools={votingPools}
					/>
				</Col>
				<Col>
					<BallotTypeSelect
						value={ballot.Type}
						onChange={value => setBallot(ballot => ({...ballot, Type: value}))}
					/>
					{(ballot.Type === BallotType.WG || ballot.Type === BallotType.SA) &&
						<BallotStageSelect
							value={ballot.Stage}
							onChange={value => setBallot(ballot => ({...ballot, Stage: value}))}
						/>}
				</Col>
			</Row>
		</Form>
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

const BallotAddDropdown = (props) => 
	<ActionButtonDropdown
		name='add'
		title='Add ballot' 
	>
		<BallotAddForm {...props} />
	</ActionButtonDropdown>

const BallotAddModal = (props) => 
	<div onClick={e => e.stopPropagation()}>
		<ActionButtonModal
			name='add'
			title='Add ballot' 
		>
			<BallotAddForm {...props} />
		</ActionButtonModal>
	</div>

export default BallotDetail;
export {BallotAddDropdown, BallotAddModal}
