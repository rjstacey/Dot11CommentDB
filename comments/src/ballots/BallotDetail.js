import PropTypes from 'prop-types';
import React from 'react';
import {connect, useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {shallowDiff, recursivelyDiffObjects, isMultiple, debounce} from 'dot11-components/lib';
import {Form, Row, Col, Field, FieldLeft, List, ListItem, Checkbox, Input, Select, TextArea} from 'dot11-components/form';
import {Button, ActionButton} from 'dot11-components/icons';
import {ActionButtonModal, ConfirmModal} from 'dot11-components/modals';
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown';

import {selectEntities, setProperty} from 'dot11-components/store/appTableData';

import {renderResultsSummary, renderCommentsSummary} from './Ballots';
import CheckboxListSelect from './CheckboxListSelect';
import ResultsActions from './ResultsActions';
import CommentsActions from './CommentsActions';
import VotingPoolSelector from './VotingPoolSelector';

import {updateBallot, addBallot, deleteBallots, loadBallots, setCurrentProject, selectProjectOptions, 
	BallotType, BallotTypeOptions, BallotStageOptions} from '../store/ballots';
import {loadVotingPools} from '../store/votingPools';

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
		PrevBallotID: '',
		Type: 0,
		IsRecirc: 0,
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
	const options = useSelector(selectProjectOptions);
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
				list.push(b);
		}
		list.sort();
		return list.map(b => ({value: b.id, label: b.BallotID}));
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

const TopicTextArea = styled(TextArea)`
	flex: 1;
	height: 3.5em;
`;

export function Column1({
	ballot,
	updateBallot,
	readOnly
}) {
	const dispatch = useDispatch();

	const change = (e) => {
		const {name, value} = e.target;
		updateBallot({[name]: value});
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
					onChange={value => updateBallot({Project: value})}
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
					disabled={readOnly || isMultiple(ballot.id)}
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
						disabled={readOnly || isMultiple(ballot.id)}
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
					disabled={readOnly || isMultiple(ballot.id)}
				/>
			</Field>
		</Row>
		<Row>
			<Field label='End:'>
				<Input type='date'
					name='End'
					value={isMultiple(ballot.End)? '': dateToShortDate(ballot.End)}
					onChange={changeDate}
					disabled={readOnly || isMultiple(ballot.id)}
				/>
			</Field>
		</Row>
		{((ballot.Type === BallotType.WG && !ballot.IsRecirc) || ballot.Type === BallotType.Motion) &&
			<Row>
				<Field label='Voter pool:'>
					<VotingPoolSelector 
						value={ballot.VotingPoolID}
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
						value={isMultiple(ballot.prev_id)? null: ballot.prev_id}
						ballot={ballot}
						placeholder={isMultiple(ballot.prev_id)? MULTIPLE_STR: BLANK_STR}
						onChange={value => updateBallot({prev_id: value})}
						width={150}
						readOnly={readOnly || isMultiple(ballot.id)}
					/>
				</Field>
			</Row>}
	</>
}

Column1.propTypes = {
	ballot: PropTypes.object.isRequired,
	updateBallot: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

const BallotContainer = styled.div`
	label {
		font-weight: bold;
	}
`;

function Ballot({
	ballot,
	updateBallot,
	readOnly
}) {
	return (
		<Row>
			<Col>
				<Column1
					ballot={ballot}
					updateBallot={updateBallot}
					readOnly={readOnly}
				/>
			</Col>
			<Col>
				<CheckboxListSelect
					label='Ballot type:'
					options={BallotTypeOptions}
					value={ballot.Type}
					onChange={value => updateBallot({Type: value})}
					readOnly={readOnly}
				/>
				{(ballot.Type === BallotType.WG || ballot.Type === BallotType.SA) &&
					<>
						<CheckboxListSelect
							label='Ballot stage:'
							options={BallotStageOptions}
							value={ballot.IsRecirc}
							onChange={value => updateBallot({IsRecirc: value})}
							readOnly={readOnly}
						/>
						<ListItem>
							<Checkbox
								id='IsComplete'
								checked={ballot.IsComplete}
								indeterminate={isMultiple(ballot.IsComplete)}
								onChange={e => updateBallot({IsComplete: e.target.checked? 1: 0})}
								disabled={readOnly}
							/>
							<label htmlFor='IsComplete' >Final in ballot series</label>
						</ListItem>
					</>}
			</Col>
		</Row>
	)
}

function BallotWithActions({
	ballot,
	updateBallot,
	readOnly
}) {
	return (
		<BallotContainer>
			<Ballot
				ballot={ballot}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
			<ResultsActions
				ballot_id={ballot.id}
				readOnly={readOnly}
			/>
			<CommentsActions 
				ballot_id={ballot.id}
				readOnly={readOnly}
			/>
		</BallotContainer>
	)
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
		if (d.Project)
			this.props.setCurrentProject(d.Project);
		this.setState(state => ({...state, saved: edited}));
	}

	handleRemoveSelected = async () => {
		const {selected} = this.props;
		const ok = await ConfirmModal.show(`Are you sure you want to delete ballots ${selected}?`);
		if (!ok)
			return;
		await this.props.deleteBallots(selected);
	}

	render() {
		const {style, className, loading, uiProperties, setUiProperty, readOnly, ballots, selected} = this.props;

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
					<BallotWithActions
						ballot={this.state.edited}
						updateBallot={this.updateBallot}
						readOnly={readOnly || !uiProperties.edit}
					/>
				}
			</BallotDetailContainer>
		)
	}

	static propTypes = {
		ballotsValid: PropTypes.bool.isRequired,
		ballots: PropTypes.object.isRequired,
		setCurrentProject: PropTypes.func.isRequired,
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
			ballots: selectEntities(state, 'ballots'),
			loading: ballots.loading,
			selected: state.ballots.selected,
			uiProperties: state.ballots.ui,
		}
	},
	{
		loadBallots,
		addBallot,
		setCurrentProject,
		updateBallot,
		deleteBallots,
		setUiProperty: (property, value) => setProperty('ballots', property, value)
	}
)(_BallotDetail);

function BallotAddForm({
	defaultBallot,
	close
}) {
	const dispatch = useDispatch();
	const [ballot, setBallot] = React.useState(defaultBallot || getDefaultBallot());
	const [errMsg, setErrMsg] = React.useState('');
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		setBusy(true);
		await dispatch(addBallot(ballot));
		await dispatch(setCurrentProject(ballot.Project));
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
			<Ballot
				ballot={ballot}
				updateBallot={updateBallot}
				readOnly={false}
			/>
		</Form>
	)
}

BallotAddForm.propTypes = {
	defaultBallot: PropTypes.object,
	//close: PropTypes.func.isRequired,
}

export const BallotAddDropdown = (props) => 
	<ActionButtonDropdown
		name='add'
		title='Add ballot' 
	>
		<BallotAddForm {...props} />
	</ActionButtonDropdown>

export const BallotAddModal = (props) => 
	<div onClick={e => e.stopPropagation()}>
		<ActionButtonModal
			name='add'
			title='Add ballot' 
		>
			<BallotAddForm {...props} />
		</ActionButtonModal>
	</div>

export default BallotDetail;
