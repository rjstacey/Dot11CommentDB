import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from '@emotion/styled';
import {Link} from "react-router-dom";

import type { RootState } from '../store';
import { useAppDispatch } from '../store/hooks';

import {
	shallowDiff, recursivelyDiffObjects, isMultiple, debounce, parseNumber,
	Button, ActionButton, Form, Row, Field, Input, Select,
	ConfirmModal, AppModal,
} from 'dot11-components';

import TimeZoneSelector from '../components/TimeZoneSelector';

import {
	addSession,
	updateSession,
	loadSessions,
	deleteSessions,
	setProperty,
	SessionTypeOptions,
	selectSessionsState,
	Session,
} from '../store/sessions';

import {importBreakouts} from '../store/breakouts';
import {importAttendances} from '../store/attendees';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

function SessionTypeSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "options" | "onChange">
) {
	const values = SessionTypeOptions.filter(o => o.value === value);
	const handleChange = (values: typeof SessionTypeOptions) => onChange(values.length > 0? values[0].value: '');
	return (
		<Select
			values={values}
			options={SessionTypeOptions}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

function SessionBreakouts({
	session,
	selected,
	readOnly
}: {
	session: Session;
	selected: number[];
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();

	const doImport = () => selected.forEach(id => dispatch(importBreakouts(id)));

	return <>
		<Row>
			<label>Breakouts:</label>
			{selected.length > 1?
				(isMultiple(session.Breakouts)? <i>{MULTIPLE_STR}</i>: session.Breakouts):
				<Link to={`/session/${session.id}/breakouts`}>{session.Breakouts}</Link>}
		</Row>
		{!readOnly && <Row>
			<Button
				onClick={doImport}
				disabled={readOnly}
			>
				Import breakouts
			</Button>
		</Row>}
	</>
}

function SessionAttendees({
	session,
	selected,
	readOnly
}: {
	session: Session;
	selected: number[];
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const doImport = () => selected.forEach(id => dispatch(importAttendances(id)));

	return <>
		<Row>
			<label>Attendees:</label>
			{selected.length > 1?
				(isMultiple(session.Attendees)? <i>{MULTIPLE_STR}</i>: session.Attendees):
				<Link to={`/session/${session.id}/attendees`}>{session.Attendees}</Link>}
		</Row>
		{!readOnly && <Row>
			<Button
				onClick={doImport}
				disabled={readOnly}
			>
				Import attendances
			</Button>
		</Row>}
	</>
}

const SessionContainer = styled.div`
	label {
		font-weight: bold;
	}
`;

function SessionEdit({
	session,
	selected,
	updateSession,
	readOnly,
}: {
	session: Session;
	selected: number[];
	readOnly?: boolean;
	updateSession: (changes: Partial<Session>) => void;
}) {
	return (
		<SessionContainer>
			<Row>
				<Field label='Start:'>
					<Input type='date' size={24}
						value={isMultiple(session.startDate)? '': session.startDate}
						placeholder={isMultiple(session.startDate)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({startDate: e.target.value})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='End:'>
					<Input type='date' size={24}
						value={isMultiple(session.endDate)? '': session.endDate}
						placeholder={isMultiple(session.endDate)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({endDate: e.target.value})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Name:'>
					<Input type='text' size={Math.max(session.name.length, 34)}
						name='Name'
						value={isMultiple(session.name)? '': session.name}
						placeholder={isMultiple(session.name)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({name: e.target.value})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Session type:' >
					<SessionTypeSelector
						value={isMultiple(session.type)? '': session.type}
						onChange={type => updateSession({type})}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='IMAT meeting number:' >
					<Input type='text'
						value={isMultiple(session.imatMeetingId)? '': session.imatMeetingId}
						placeholder={isMultiple(session.imatMeetingId)? MULTIPLE_STR: BLANK_STR}
						onChange={e => updateSession({imatMeetingId: parseNumber(e.target.value)})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Time zone:'>
					<TimeZoneSelector
						value={isMultiple(session.timezone)? '': session.timezone}
						placeholder={isMultiple(session.timezone)? MULTIPLE_STR: BLANK_STR}
						onChange={timezone => updateSession({timezone})}
						style={{width: 200}}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<SessionBreakouts
				session={session}
				selected={selected}
				readOnly={readOnly}
			/>
			<SessionAttendees
				session={session}
				selected={selected}
				readOnly={readOnly}
			/>
		</SessionContainer>
	)
}

const TopRow = styled.div`
	display: flex;
	justify-content: flex-end;
	width: 100%;
`;

const NotAvaialble = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

const DetailContainer = styled.div`
	padding: 10px;
`;

type SessionDetailProps = {
	style?: React.CSSProperties;
	className?: string;
	readOnly?: boolean;
};

type SessionDetailInternalProps = SessionDetailConnectedProps & SessionDetailProps;

type SessionDetailState = {
	saved: Session | {},
	edited: Session | {},
	originals: Session[];
}

class SessionDetail extends React.Component<SessionDetailInternalProps, SessionDetailState> {
	constructor(props: SessionDetailInternalProps) {
		super(props)
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	triggerSave: ReturnType<typeof debounce>;

	componentDidMount() {
		if (!this.props.valid)
			this.props.loadSessions();
	}

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props: SessionDetailInternalProps) => {
		const {sessions, selected} = props;
		let diff = {}, originals = [];
		for (const id of selected) {
			const session = sessions[id];
			if (session) {
				diff = recursivelyDiffObjects(diff, session);
				originals.push(session);
			}
		}
		return {
			saved: diff,
			edited: diff,
			originals: originals
		};
	}

	updateSession = (changes: Partial<Session>) => {
		const {readOnly, uiProperties} = this.props;
		if (readOnly || !uiProperties.editSession) {
			console.warn("Update in read-only component")
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
			updates.forEach(u => this.props.updateSession(u.id, u));
		this.setState(state => ({...state, saved: edited}));
	}

	handleRemoveSelected = async () => {
		const {selected, deleteSessions} = this.props;
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected sessions?');
		if (ok) {
			await deleteSessions(selected as number[]);
		}
	}

	handleToggleEditSession = () => this.props.setUiProperty('editSession', !this.props.uiProperties.editSession);

	render() {
		const {style, className, loading, selected, uiProperties, readOnly} = this.props;
		const {edited} = this.state;

		let notAvailableStr
		if (loading)
			notAvailableStr = 'Loading...';
		else if (selected.length === 0)
			notAvailableStr = 'Nothing selected';
		const disableButtons = !!notAvailableStr; 	// disable buttons if displaying string

		return (
				<DetailContainer
					style={style}
					className={className}
				>
					<TopRow>
						{!this.props.readOnly &&
							<>
								<ActionButton
									name='edit'
									title='Edit session'
									disabled={disableButtons}
									isActive={uiProperties.editSession}
									onClick={this.handleToggleEditSession}
								/>
								<ActionButton
									name='delete'
									title='Delete session'
									disabled={disableButtons}
									onClick={this.handleRemoveSelected}
								/>
							</>}
					</TopRow>
					{notAvailableStr?
						<NotAvaialble>
							<span>{notAvailableStr}</span>
					 	</NotAvaialble>:
						<SessionEdit
							session={edited as Session}
							selected={selected as number[]}
							updateSession={this.updateSession}
							readOnly={readOnly || !uiProperties.editSession}
						/>
					}
				</DetailContainer>
			)
	}
}

const connector = connect(
	(state: RootState) => {
		const sessions = selectSessionsState(state);
		return {
			sessions: sessions.entities,
			loading: sessions.loading,
			valid: sessions.valid,
			selected: sessions.selected,
			uiProperties: sessions.ui,
		}
	},
	{
		loadSessions,
		updateSession,
		deleteSessions,
		setUiProperty: (property: string, value: any) => setProperty({property, value}),
	}
);

type SessionDetailConnectedProps = ConnectedProps<typeof connector>;

const ConnectedSessionDetail = connector(SessionDetail);

function SessionImportModal({
	isOpen,
	close,
	defaultSession,
}: {
	isOpen: boolean;
	close: () => void;
	defaultSession: Session | null;
}) {
	const [session, setSession] = React.useState(defaultSession);
	const dispatch = useAppDispatch();
	React.useEffect(() => setSession(defaultSession), [isOpen]);

	async function submit() {
		dispatch(addSession(session!));
		close();
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<Form
				title={`Add session`}
				submit={submit}
				cancel={close}
			>
				<SessionEdit
					session={session!}
					selected={[]}
					updateSession={(changes) => setSession(s => ({...s!, ...changes}))}
				/>
			</Form>
		</AppModal>
	)
}

export {SessionImportModal};
export default ConnectedSessionDetail;
