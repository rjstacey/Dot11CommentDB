import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {ActionButton, Button, Form, Row, Col, Field, FieldLeft, Input, InputDates, InputTime, Checkbox} from 'dot11-components/form';
import {ConfirmModal} from 'dot11-components/modals';
import {isMultiple} from 'dot11-components/lib';

import {selectWebexMeetingsState, deleteWebexMeetings} from '../store/webexMeetings';

import WebexAccountSelector from '../accounts/WebexAccountSelector';
import WebexTemplateSelector from '../accounts/WebexTemplateSelector';
import {displayMeetingNumber} from '../store/webexMeetings';

const MULTIPLE_STR = '(Multiple)';

export function WebexMeetingEdit({
	value,
	onChange,
	webexAccountId,
	onChangeWebexAccountId,
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
					value={isMultiple(webexAccountId)? null: webexAccountId}
					onChange={webexAccountId => onChangeWebexAccountId({webexAccountId})}
					placeholder={isMultiple(webexAccountId)? MULTIPLE_STR: undefined}
					readOnly={readOnly || !isNew}
				/>
			</Field>
			{!webexMeeting.id &&
				<Field label='Template'>
					<WebexTemplateSelector
						value={webexMeeting.templateId}
						onChange={templateId => changeWebexMeeting({templateId})}
						accountId={isMultiple(webexAccountId)? null: webexAccountId}
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

function WebexMeetingEntry({value, onChange}) {

	console.log(value)
	return (
		<Form
		>
			<WebexMeetingEdit
				value={value}
				onChange={onChange}
			/>
		</Form>
	)
}

const TopRow = styled.div`
	display: flex;
	justify-content: flex-end;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

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

function WebexMeetingDetail({value, onChange}) {
	const dispatch = useDispatch();
	const {loading, selected, entities} = useSelector(selectWebexMeetingsState);

	const clickDelete = React.useCallback(async () => {
		const ids = selected;
		const ok = await ConfirmModal.show(
			'Are you sure you want to delete the ' + 
				(ids.length > 1?
					ids.length + ' selected entries?':
					'selected entry?')
		);
		if (!ok)
			return;
		await dispatch(deleteWebexMeetings(ids));
	}, [selected, dispatch]);

	let notAvailableStr = '';
	if (loading)
		notAvailableStr = 'Loading...';
	else if (selected.length === 0)
		notAvailableStr = 'Nothing selected';

	return (
		<Container>
			<TopRow>
				<ActionButton
					name='add'
					title='Add as telecon'
					disabled={loading}
				/>
				<ActionButton
					name='delete'
					title='Link to telecon'
					disabled={loading || selected.length === 0}
				/>
				<ActionButton
					name='delete'
					title='Delete webex meeting'
					disabled={loading || selected.length === 0}
					onClick={clickDelete}
				/>
			</TopRow>
			{notAvailableStr?
				<NotAvailable>{notAvailableStr}</NotAvailable>:
				<WebexMeetingEntry
					value={value}
					onChange={() => {}}
				/>}
		</Container>
	)
}

export default WebexMeetingDetail;
