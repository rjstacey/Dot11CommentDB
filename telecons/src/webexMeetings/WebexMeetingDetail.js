import React from 'react';
import {connect} from 'react-redux';
import styled from '@emotion/styled';

import {ActionButton, Form, Row, Col, Field, FieldLeft, Input, Checkbox} from 'dot11-components/form';
import {ConfirmModal} from 'dot11-components/modals';
import {deepDiff, deepMerge, deepMergeTagMultiple, isMultiple} from 'dot11-components/lib';

import {
	selectWebexMeetingsState,
	deleteWebexMeetings,
	setSelected
} from '../store/webexMeetings';

import {selectCurrentState} from '../store/current';

import WebexAccountSelector from '../components/WebexAccountSelector';
import WebexTemplateSelector from '../components/WebexTemplateSelector';
import TopRow from '../components/TopRow';

const MULTIPLE_STR = '(Multiple)';

function WebexMeetingEdit({
	value,
	onChange,
	readOnly,
	isNew,
}) {
	const webexMeeting = value || {};
	const meetingOptions = webexMeeting.meetingOptions || {};

	const changeWebexMeeting = (changes) => {
		if (changes.enabledJoinBeforeHost === false) {
			changes.joinBeforeHostMinutes = 0;
			changes.enableConnectAudioBeforeHost = false;
		}
		onChange(changes);
	}

	const changeWebexMeetingOptions = (changes) => {
		const u = {...meetingOptions, ...changes};
		changeWebexMeeting({meetingOptions: u});
	}

	return (
		<Col
			style={{marginLeft: 10}}
		>
			<Field label='Webex account'>
				<WebexAccountSelector
					value={isMultiple(webexMeeting.webexAccountId)? null: webexMeeting.webexAccountId}
					onChange={webexAccountId => changeWebexMeeting({webexAccountId})}
					placeholder={isMultiple(webexMeeting.webexAccountId)? MULTIPLE_STR: undefined}
					readOnly={readOnly || !isNew}
				/>
			</Field>
			{!webexMeeting.id &&
				<Field label='Template'>
					<WebexTemplateSelector
						value={webexMeeting.templateId}
						onChange={templateId => changeWebexMeeting({templateId})}
						accountId={isMultiple(webexMeeting.webexAccountId)? null: webexMeeting.webexAccountId}
						readOnly={readOnly}
					/>
				</Field>}
			<Field label='Password:'>
				<Input 
					type='search'
					value={webexMeeting.password}
					onChange={e => changeWebexMeeting({password: e.target.value})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Join before host (minutes):'>
				<Checkbox
					checked={webexMeeting.enabledJoinBeforeHost}
					onChange={e => changeWebexMeeting({enabledJoinBeforeHost: e.target.checked})}
					disabled={readOnly}
				/>
				<Input 
					type='text'
					value={webexMeeting.joinBeforeHostMinutes}
					onChange={e => changeWebexMeeting({joinBeforeHostMinutes: e.target.value})}
					disabled={readOnly || !webexMeeting.enabledJoinBeforeHost}
				/>
			</Field>
			<Field label='Connect audio before host:'>
				<Checkbox 
					checked={webexMeeting.enableConnectAudioBeforeHost}
					onChange={e => changeWebexMeeting({enableConnectAudioBeforeHost: e.target.checked})}
					disabled={readOnly || !webexMeeting.enabledJoinBeforeHost}
				/>
			</Field>
			<Row>
				<FieldLeft label='Chat:'>
					<Checkbox 
						checked={meetingOptions.enabledChat}
						onChange={e => changeWebexMeetingOptions({enabledChat: e.target.checked})}
						disabled={readOnly}
					/>
				</FieldLeft>
				<FieldLeft label='Video:'>
					<Checkbox 
						checked={meetingOptions.enabledVideo}
						onChange={e => changeWebexMeetingOptions({enabledVideo: e.target.checked})}
						disabled={readOnly}
					/>
				</FieldLeft>
			</Row>
			<Field label='Notes:'>
				<Checkbox 
					checked={meetingOptions.enabledNote}
					onChange={e => changeWebexMeetingOptions({enabledNote: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='Closed captions:'>
				<Checkbox 
					checked={meetingOptions.enabledClosedCaptions}
					onChange={e => changeWebexMeetingOptions({enabledClosedCaptions: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
			<Field label='File transfer:'>
				<Checkbox 
					checked={meetingOptions.enabledFileTransfer}
					onChange={e => changeWebexMeetingOptions({enabledFileTransfer: e.target.checked})}
					disabled={readOnly}
				/>
			</Field>
		</Col>
	)
}

function WebexMeetingEntry({
	action,
	entry,
	onChange,
	actionAdd,
	actionUpdate,
	actionCancel
}) {

	return (
		<Form
			submitLabel={action === 'add'? 'Add': 'Update'}
			submit={action === 'add'? actionAdd: actionUpdate}
			cancel={actionCancel}
		>
			<WebexMeetingEdit
				value={entry}
				onChange={onChange}
				isNew={action === 'add'}
			/>
		</Form>
	)
}

const Container = styled.div`
	padding: 10px;
	label {
		font-weight: bold;
	}
`;

const NotAvailable = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

const defaultWebexMeeting = {
	password: 'wireless',
	enabledJoinBeforeHost: true,
	joinBeforeHostMinutes: 10,
	enableConnectAudioBeforeHost: true,
	meetingOptions: {
		enabledChat: true,
		enabledVideo: true,
		enabledNote: false,
		enabledClosedCaptions: true,
		enabledFileTransfer: false
	}
}

function addWebexMeeting(webexMeeting) {
	console.log('add: ', webexMeeting);
	return Promise.resolve('ok')
}

function updateWebexMeetings(webexMeeting) {
	console.log('update: ', webexMeeting);
	return Promise.resolve('ok')
}

class WebexMeetingDetail extends React.Component {

	constructor(props) {
		super(props);
		this.state = this.initState('update');
	}

	initState = (action) => {
		const {entities, selected, defaults} = this.props;

		const ids = selected;
		let entry;
		if (ids.length > 0) {
			entry = ids.reduce((entry, id) => deepMergeTagMultiple(entry, entities[id]), {});
			if (action === 'add') {
				delete entry.id;
				entry.isCancelled = false;
				entry.timezone = defaults.timezone;
				entry.calendarAccountId = defaults.calendarAccountId;
				entry.webexAccountId = defaults.webexAccountId;
				entry.webexMeeting = {...defaultWebexMeeting, templateId: defaults.webex_template_id};
			}
		}
		else {
			entry = {
				...defaultWebexMeeting,
				webexAccountId: defaults.webexAccountId,
				templateId: defaults.webex_template_id
			};
		}

		return {
			action,
			entry,
			ids
		}
	}

	clickAdd = async () => {
		const {setSelected} = this.props;
		const {action} = this.state;

		console.log('clickAdd')
		if (action === 'update') {
			const updates = this.getUpdates();
			if (updates.length > 0) {
				const ok = await ConfirmModal.show(`Changes not applied! Do you want to discard changes?`);
				if (!ok)
					return;
			}
		}
		if (action !== 'add') {
			this.setState(this.initState('add'));
			setSelected([]);
		}
	}

	clickDelete = async () => {
		const ids = this.props.selected;
		const ok = await ConfirmModal.show(
			'Are you sure you want to delete the ' + 
				(ids.length > 1?
					ids.length + ' selected entries?':
					'selected entry?')
		);
		if (!ok)
			return;
		await this.props.deleteWebexMeetings(ids);
	}

	changeEntry = (changes) => {
		const {action} = this.state;
		if (action === 'view') {
			console.warn("Update when read-only");
			return;
		}
		this.setState(state => {
			const entry = deepMerge(state.entry, changes);
			return {...state, entry}
		});
	}

	getUpdates = () => {
		let {entry, ids} = this.state;
		const {entities} = this.props;

		console.log('getUpdates')
		const collapsed = ids.reduce((entry, id) => deepMergeTagMultiple(entry, entities[id]), {});
		
		// Find differences

		const updates = [];
		for (const id of ids) {
			const changes = deepDiff(collapsed, entry);
			console.log(changes)
			if (Object.keys(changes).length > 0)
				updates.push({id, changes});
		}
		return updates;
	}

	add = async () => {
		const {setSelected} = this.props;
		const {entry} = this.state;

		let errMsg = '';
		if (entry.dates.length === 0)
			errMsg = 'Date(s) not set';
		else if (!entry.time)
			errMsg = 'Start time not set'
		else if (!entry.duration)
			errMsg = 'Duration not set';
		else if (!entry.timezone)
			errMsg = 'Time zone not set';
		else if (entry.webexMeeting && !entry.webexAccountId)
			errMsg = 'Must select Webex account to schedule webex meeting';

		if (errMsg) {
			ConfirmModal.show(errMsg, false);
			return;
		}

		addWebexMeeting(entry)
			.then(ids => setSelected(ids))
			.then(() => this.setState(this.initState('update')));
	}

	update = async () => {
		//const {updateTelecons} = this.props;

		const updates = this.getUpdates();
		console.log(updates)
		await updateWebexMeetings(updates);
		this.setState(this.initState('update'));
	}

	cancel = () => {
		this.setState(this.initState('update'));
	}

	render() {
		const {loading, selected} = this.props;
		const {action, entry} = this.state;

		let notAvailableStr = '';
		if (loading)
			notAvailableStr = 'Loading...';
		else if (action === 'update' && selected.length === 0)
			notAvailableStr = 'Nothing selected';

		return (
			<Container>
				<TopRow style={{justifyContent: 'flex-end'}}>
					<ActionButton
						name='add'
						title='Add Webex meeting'
						disabled={loading}
						onClick={this.clickAdd}
					/>
					<ActionButton
						name='link'
						title='Link to meeting'
						disabled={loading || selected.length === 0}
						onClick={() => alert('missing functionality')}
					/>
					<ActionButton
						name='delete'
						title='Delete webex meeting'
						disabled={loading || selected.length === 0}
						onClick={this.clickDelete}
					/>
				</TopRow>
				{notAvailableStr?
					<NotAvailable>{notAvailableStr}</NotAvailable>:
					<WebexMeetingEntry
						action={action}
						entry={entry}
						onChange={this.changeEntry}
						webexAccountId={entry.webexAccountId}
						actionAdd={this.add}
						actionUpdate={this.update}
						actionCancel={this.cancel}
					/>}
			</Container>
		)
	}
}

const ConnectedWebexMeetingDetail = connect(
	(state) => ({
		loading: selectWebexMeetingsState(state).loading,
		selected: selectWebexMeetingsState(state).selected,
		entities: selectWebexMeetingsState(state).entities,
		defaults: selectCurrentState(state),
	}),
	{
		deleteWebexMeetings,
		setSelected,
	}
)(WebexMeetingDetail);

export default ConnectedWebexMeetingDetail;
