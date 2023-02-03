import PropTypes from 'prop-types';
import React from 'react';
import {connect, useSelector, useDispatch} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import {shallowDiff, deepDiff, isMultiple, debounce} from 'dot11-components/lib';
import {ConfirmModal} from 'dot11-components/modals';
import {ActionButton, Row, Field, Input, TextArea, Select} from 'dot11-components/form';

import TimeZoneSelector from '../components/TimeZoneSelector';
import ImatMeetingSelector from '../components/ImatMeetingSelector';
import TopRow from '../components/TopRow';
import GroupSelector from '../components/GroupSelector';
import RoomDetails from './RoomDetails';
import TimeslotDetails from './TimeslotDetails';
import SessionCredit from './SessionCredit';

import {
	loadSessions,
	addSession,
	updateSession,
	deleteSessions,
	setSessionsSelected,
	setSessionsUiProperty,
	SessionTypeOptions,
	selectSessionsState
} from '../store/sessions';

import {selectMeetingsState} from '../store/meetings';

import {selectUserMeetingsAccess, AccessLevel} from '../store/user';

const BLANK_STR = '(Blank)';
const MULTIPLE_STR = '(Multiple)';

const defaultSession = {
	name: 'New session',
	type: 'p',
	imatMeetingId: null,
	startDate: new Date().toISOString().substring(0, 10),
	endDate: new Date().toISOString().substring(0, 10),
	timezone: 'America/New_York',
}

function SessionTypeSelector({value, onChange, ...otherProps}) {
	const values = SessionTypeOptions.filter(o => o.value === value);
	const handleChange = (values) => onChange(values.length > 0? values[0].value: null);
	return (
		<Select
			values={values}
			options={SessionTypeOptions}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

const SessionContainer = styled.div`
	label {
		font-weight: bold;
	}
`;

function SessionBasics({
	session,
	updateSession,
	readOnly,
}) {

	function handleChange(changes) {
		if ('startDate' in changes) {
			const startDate = DateTime.fromISO(changes.startDate);
			const endDate = DateTime.fromISO(session.endDate);
			if (startDate.isValid) {
				// For plenary and interim sessions, assume ends 5 days later (usually Sun - Fri)
				// otherwise, just make sure end date is later than start date
				if (session.type === 'p' || session.type === 'i')
					changes.endDate = startDate.plus({days: 5}).toISODate();
				else if (endDate < startDate)
					changes.endDate = startDate.toISODate();
			}
		}
		else if ('endDate' in changes) {
			// Ensure that the start date is never later than end date
			const endDate = DateTime.fromISO(changes.endDate);
			const startDate = DateTime.fromISO(session.startDate);
			if (endDate.isValid && endDate < startDate)
				changes.startDate = endDate.toISODate();
		}
		updateSession(changes);
	}

	const nameMinWidthCh = Math.max(session.name.length, 24);

	return (
		<>
			<Row>
				<Field label='Session name:'>
					<TextArea 
						style={{width: `${nameMinWidthCh}ch`}}
						name='Name'
						value={isMultiple(session.name)? '': session.name}
						placeholder={isMultiple(session.name)? MULTIPLE_STR: BLANK_STR}
						onChange={e => handleChange({name: e.target.value})}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Session type:' >
					<SessionTypeSelector
						value={isMultiple(session.type)? null: session.type}
						onChange={type => handleChange({type})}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Organizing group:' >
					<GroupSelector
						value={isMultiple(session.groupId)? null: session.groupId}
						onChange={groupId => handleChange({groupId})}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start:'>
					<Input type='date'
						value={isMultiple(session.startDate)? '': session.startDate}
						onChange={e => handleChange({startDate: e.target.value})}
						placeholder={isMultiple(session.startDate)? MULTIPLE_STR: BLANK_STR}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='End:'>
					<Input type='date'
						value={isMultiple(session.endDate)? '': session.endDate}
						onChange={e => handleChange({endDate: e.target.value})}
						placeholder={isMultiple(session.endDate)? MULTIPLE_STR: BLANK_STR}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Time zone:'>
					<TimeZoneSelector
						style={{width: 200}}
						value={isMultiple(session.timezone)? null: session.timezone}
						onChange={timezone => handleChange({timezone})}
						placeholder={isMultiple(session.timezone)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='IMAT meeting:' >
					<ImatMeetingSelector
						value={isMultiple(session.imatMeetingId)? '': session.imatMeetingId}
						onChange={imatMeetingId => handleChange({imatMeetingId})}
						placeholder={isMultiple(session.imatMeetingId)? MULTIPLE_STR: BLANK_STR}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
		</>
	)
}

function SessionEdit({
	session,
	updateSession,
	readOnly
}) {
	const uiProperties = useSelector(selectSessionsState).ui;
	const dispatch = useDispatch();
	const updateUiProperties = (changes) => {
		for (const key of Object.keys(changes))
			dispatch(setSessionsUiProperty(key, changes[key]));
	}

	const isSession = session.type === 'p' || session.type === 'i';

	return (
		<SessionContainer>
			<SessionBasics
				session={session}
				updateSession={updateSession}
				readOnly={readOnly || !uiProperties.editEnabled}
			/>
			{isSession &&
				<Tabs
					onSelect={tabIndex => updateUiProperties({tabIndex})}
					selectedIndex={uiProperties.tabIndex}
				>
					<TabList>
						<Tab>Rooms</Tab>
						<Tab>Timeslots</Tab>
						<Tab>Credit</Tab>
					</TabList>
					<TabPanel>
						<RoomDetails
							rooms={session.rooms || []}
							setRooms={(rooms) => updateSession({rooms})}
							readOnly={readOnly}
						/>
					</TabPanel>
					<TabPanel>
						<TimeslotDetails
							timeslots={session.timeslots || []}
							setTimeslots={(timeslots) => updateSession({timeslots})}
							readOnly={readOnly}
						/>
					</TabPanel>
					<TabPanel>
						<SessionCredit
							session={session}
							updateSession={updateSession}
							readOnly={readOnly}
						/>
					</TabPanel>
				</Tabs>}
		</SessionContainer>
	)
}

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

class SessionDetail extends React.Component {
	constructor(props) {
		super(props)
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	componentDidUpdate(prevProps, prevState) {
		const {props} = this;
		if (props.selected.join() !== prevProps.selected.join()) {
			this.triggerSave.flush();
			this.setState(this.initState(props));
		}
	}

	initState = (props) => {
		const {sessions, selected} = props;
		const ids = selected.filter(id => sessions[id]);
		const diff = ids.reduce((diff, id) => deepDiff(diff, sessions[id]), {});
		return {
			saved: diff,
			edited: diff,
			ids
		};
	}

	updateSession = (changes) => {
		const {readOnly, uiProperties} = this.props;
		if (readOnly || !uiProperties.editEnabled) {
			console.warn("Update in read-only component")
			return;
		}
		this.setState(
			state => ({...state, edited: {...state.edited, ...changes}}),
			this.triggerSave
		);
	}

	save = () => {
		const {updateSession} = this.props;
		const {edited, saved, ids} = this.state;

		const changes = shallowDiff(saved, edited);

		if (('startDate' in changes && !DateTime.fromISO(changes.startDate).isValid) ||
			('endDate' in changes && !DateTime.fromISO(changes.endDate).isValid)) {
			return;	// wait for further changes
		}

		if (Object.keys(changes).length > 0)
			ids.forEach(id => updateSession(id, changes));

		this.setState(state => ({...state, saved: edited}));
	}

	add = async () => {
		const {addSession, setSelected} = this.props;
		const id = await addSession(defaultSession);
		setSelected([id]);
	}

	handleRemoveSelected = async () => {
		const {selected, deleteSessions} = this.props;
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected sessions?');
		if (ok)
			await deleteSessions(selected);
	}

	handleToggleEditEnabled = () => this.props.setUiProperty('editEnabled', !this.props.uiProperties.editEnabled);

	render() {
		const {style, className, loading, uiProperties, access} = this.props;
		const {edited, ids} = this.state;

		let notAvailableStr
		if (loading)
			notAvailableStr = 'Loading...';
		else if (ids.length === 0)
			notAvailableStr = 'Nothing selected';
		const disableButtons = !!notAvailableStr; 	// disable buttons if displaying string

		const readOnly = access <= AccessLevel.ro;

		return (
				<DetailContainer
					style={style}
					className={className}
				>
					<TopRow style={{justifyContent: 'flex-end'}}>
						{!readOnly &&
							<>
								<ActionButton
									name='edit'
									title='Edit session'
									disabled={disableButtons}
									isActive={uiProperties.editEnabled || readOnly}
									onClick={this.handleToggleEditEnabled}
								/>
								<ActionButton
									name='add'
									title='Add a session'
									disabled={disableButtons || !uiProperties.editEnabled || readOnly}
									onClick={this.add}
								/>
								<ActionButton
									name='delete'
									title='Delete session'
									disabled={disableButtons || !uiProperties.editEnabled || readOnly}
									onClick={this.handleRemoveSelected}
								/>
							</>}
					</TopRow>
					{notAvailableStr?
						<NotAvaialble>
							<span>{notAvailableStr}</span>
					 	</NotAvaialble>:
					 	<SessionEdit
					 		session={edited}
					 		updateSession={this.updateSession}
					 		readOnly={readOnly || !uiProperties.editEnabled}
					 	/>
					}
				</DetailContainer>
			)
	}

	static propTypes = {
		sessions: PropTypes.object.isRequired,
		loading: PropTypes.bool.isRequired,
		uiProperties: PropTypes.object.isRequired,
		loadSessions: PropTypes.func.isRequired,
		updateSession: PropTypes.func.isRequired,
		deleteSessions: PropTypes.func.isRequired
	}
}

const ConnectedSessionDetail = connect(
	(state) => {
		const sessions = selectSessionsState(state);
		return {
			sessions: sessions.entities,
			loading: sessions.loading,
			selected: sessions.selected,
			uiProperties: sessions.ui,
			access: selectUserMeetingsAccess(state)
		}
	},
	{
		loadSessions,
		updateSession,
		deleteSessions,
		addSession,
		setSelected: setSessionsSelected,
		setUiProperty: setSessionsUiProperty,
	}
)(SessionDetail);

export default ConnectedSessionDetail;
