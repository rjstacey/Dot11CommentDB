import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from '@emotion/styled';
import { DateTime } from 'luxon';

import {
	shallowDiff, recursivelyDiffObjects, isMultiple, debounce,
	ActionButton, Form, Row, Col, Field, ListItem, Checkbox, Input, Select, TextArea,
	ConfirmModal,
	ActionButtonDropdown,
	Multiple
} from 'dot11-components';

import CheckboxListSelect from './CheckboxListSelect';
import ResultsActions from './ResultsActions';
import CommentsActions from './CommentsActions';
import VotingPoolSelector from './VotingPoolSelector';

import type { RootState } from '../store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	updateBallot,
	addBallot,
	deleteBallots,
	loadBallots,
	setCurrentProject,
	setUiProperties,
	selectBallotsState,
	selectProjectOptions, 
	BallotType,
	BallotTypeOptions,
	BallotStageOptions,
	Ballot,
	BallotCreate,
} from '../store/ballots';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

function getDefaultBallot(): BallotCreate {
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	return {
		Project: '',
		BallotID: '',
		EpollNum: 0,
		Document: '',
		Topic: '',
		Start: today.toISOString(),
		End: today.toISOString(),
		VotingPoolID: '',
		prev_id: 0,
		Type: 0,
		IsRecirc: false,
		IsComplete: false
	}
}

/* Convert an ISO date string to US eastern time and return string in form "YYYY-MM-DD" */
function dateToShortDate(isoDate: string | null) {
	if (!isoDate)
		return '';
	const utcDate = new Date(isoDate)
	const date = new Date(utcDate.toLocaleString("en-US", {timeZone: "America/New_York"}))
	return date.getFullYear() + '-' + ('0' + (date.getMonth()+1)).substr(-2) + '-' + ('0' + date.getDate()).substr(-2)
}

/* Parse date in form "YYYY-MM-DD" as US eastern time and convert to UTC ISO date string */
function shortDateToDate(shortDateStr: string) {
	const date = new Date(shortDateStr)	// local time
	const easternDate = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}))
	const utcDate = new Date(date.toLocaleString("en-US", {timeZone: "UTC"}))
	const diff = utcDate.getTime() - easternDate.getTime();
	let newDate = new Date(date.getTime() + diff);
	return isNaN(newDate.getTime())? '': newDate.toISOString()
}

function SelectProject({value, onChange, ...otherProps}) {
	const options = useAppSelector(selectProjectOptions);
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

function SelectPrevBallot({
	value,
	ballot,
	onChange,
	...otherProps
}: {
	ballot: BallotCreate | Multiple<Ballot>;
	value: number | null;
	onChange: (value: number | null) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const {ids, entities} = useAppSelector(selectBallotsState);
	const options = React.useMemo(() => {
		return ids
			.map(id => entities[id]!)
			.filter(b => b.Project === ballot.Project && DateTime.fromISO(b.Start || '') < DateTime.fromISO(ballot.Start || ''))
			.map(b => ({value: b.id, label: b.BallotID}));
	}, [ballot, ids, entities]);
	const values = options.filter(o => o.value === value);
	return (
		<Select
			values={values}
			options={options}
			onChange={(values) => onChange(values.length? values[0].value: null)}
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
}: {
	ballot: Multiple<Ballot> | BallotCreate;
	updateBallot: (changes: Partial<Ballot>) => void;
	readOnly?: boolean;
}) {
	const isMultipleBallots = 'id' in ballot && isMultiple(ballot.id);

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
					disabled={readOnly || isMultipleBallots}
				/>
			</Field>
		</Row>
		{ballot.Type !== BallotType.SA &&
			<Row>
				<Field label='ePoll number:'>
					<Input type='search'
						name='EpollNum'
						value={"" + (isMultiple(ballot.EpollNum)? '': ballot.EpollNum)}
						onChange={(e) => updateBallot({EpollNum: Number(e.target.value)})}
						placeholder={isMultiple(ballot.BallotID)? MULTIPLE_STR: BLANK_STR}
						disabled={readOnly || isMultipleBallots}
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
					disabled={readOnly || isMultipleBallots}
				/>
			</Field>
		</Row>
		<Row>
			<Field label='End:'>
				<Input type='date'
					name='End'
					value={isMultiple(ballot.End)? '': dateToShortDate(ballot.End)}
					onChange={changeDate}
					disabled={readOnly || isMultipleBallots}
				/>
			</Field>
		</Row>
		{((ballot.Type === BallotType.WG && !ballot.IsRecirc) || ballot.Type === BallotType.Motion) &&
			<Row>
				<Field label='Voter pool:'>
					<VotingPoolSelector 
						value={ballot.VotingPoolID}
						onChange={value => updateBallot({VotingPoolID: value})}
						style={{width: 150}}
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
						style={{width: 150}}
						readOnly={readOnly || isMultipleBallots}
					/>
				</Field>
			</Row>}
	</>
}

const BallotContainer = styled.div`
	label {
		font-weight: bold;
	}
`;

function BallotEdit({
	ballot,
	updateBallot,
	readOnly
}: {
	ballot: Multiple<Ballot> | BallotCreate;
	updateBallot: (changes: Partial<Ballot>) => void;
	readOnly?: boolean;
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
							value={isMultiple(ballot.IsRecirc)? ballot.IsRecirc: ballot.IsRecirc? 1: 0}
							onChange={value => updateBallot({IsRecirc: value? true: false})}
							readOnly={readOnly}
						/>
						<ListItem>
							<Checkbox
								id='IsComplete'
								checked={isMultiple(ballot.IsComplete)? false: ballot.IsComplete}
								indeterminate={isMultiple(ballot.IsComplete)}
								onChange={e => updateBallot({IsComplete: e.target.checked})}
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
}: {
	ballot: MultipleBallot;
	updateBallot: (changes: Partial<Ballot>) => void;
	readOnly?: boolean;
}) {
	return (
		<BallotContainer>
			<BallotEdit
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

type MultipleBallot = Multiple<Ballot>;

type BallotDetailState = {
	saved: MultipleBallot;
	edited: MultipleBallot;
	originals: Ballot[];
}

class _BallotDetail extends React.Component<BallotDetailProps, BallotDetailState> {
	constructor(props: BallotDetailProps) {
		super(props)
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	triggerSave: ReturnType<typeof debounce>;

	componentDidMount() {
		if (!this.props.ballotsValid)
			this.props.loadBallots();
	}

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props: BallotDetailProps): BallotDetailState => {
		const {ballots, selected} = props;
		let diff = {}, originals: Ballot[] = [];
		for (const id of selected) {
			const ballot = ballots[id]!;
			if (ballot) {
				diff = recursivelyDiffObjects(diff, ballot);
				originals.push(ballot);
			}
		}
		return {
			saved: diff as MultipleBallot,
			edited: diff as MultipleBallot,
			originals: originals
		};
	}

	updateBallot = (changes: Partial<Ballot>) => {
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
		const d = shallowDiff(saved, edited) as Partial<Ballot>;
		const updates: (Partial<Ballot> & {id: number})[] = [];
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
		const {selected, ballots} = this.props;
		const list = selected.map(id => ballots[id]!.BallotID).join(', ');
		const ok = await ConfirmModal.show(`Are you sure you want to delete ballot${selected.length > 0? 's': ''} ${list}?`);
		if (!ok)
			return;
		await this.props.deleteBallots(selected);
	}

	render() {
		const {style, className, loading, uiProperties, setUiProperties, readOnly} = this.props;

		let notAvailableStr: string | undefined;
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
								onClick={() => setUiProperties({edit: !uiProperties.edit})}
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
}

const connector = connect(
	(state: RootState) => {
		const ballotsState = selectBallotsState(state);
		return {
			ballotsValid: ballotsState.valid,
			ballots: ballotsState.entities,
			loading: ballotsState.loading,
			selected: ballotsState.selected,
			uiProperties: ballotsState.ui,
		}
	},
	{
		loadBallots,
		addBallot,
		setCurrentProject,
		updateBallot,
		deleteBallots,
		setUiProperties
	}
);

type BallotDetailProps = ConnectedProps<typeof connector> & {
	className?: string;
	style?: React.CSSProperties;
	readOnly?: boolean;
};

const BallotDetail = connector(_BallotDetail);

export function BallotAddForm({
	defaultBallot,
	methods
}: {
	defaultBallot?: BallotCreate;
	methods: {close: () => void};
}) {
	const dispatch = useAppDispatch();
	const [ballot, setBallot] = React.useState<BallotCreate>(defaultBallot || getDefaultBallot());
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		setBusy(true);
		await dispatch(addBallot(ballot));
		dispatch(setCurrentProject(ballot.Project));
		setBusy(false);
		methods.close();
	}

	const updateBallot = (changes) => setBallot(ballot => ({...ballot, ...changes}));

	return (
		<Form
			style={{width: '700px'}}
			title='Add ballot'
			submit={submit}
			submitLabel='Add'
			cancel={methods.close}
			busy={busy}
		>
			<BallotEdit
				ballot={ballot}
				updateBallot={updateBallot}
				readOnly={false}
			/>
		</Form>
	)
}

export const BallotAddDropdown = (props) => 
	<ActionButtonDropdown
		name='add'
		title='Add ballot'
		dropdownRenderer={(props) => <BallotAddForm {...props} />}
	/>

export default BallotDetail;
