import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import {AppModal} from 'dot11-common/modals'
import {Form, Row, Field, Input, Select} from 'dot11-common/general/Form'
import TimeZoneSelector from './TimeZoneSelector'
import {updateSession, addSession, MeetingTypeOptions} from '../store/sessions'

function getDate(d) {
	const s = d instanceof Date? d.toISOString(): d;
	return s.substring(0, 10);
}

function _SessionDialog({
	action,
	defaultValue,
	close,
	addSession,
	updateSession
}) {
	const [session, setSession] = React.useState(defaultValue);
	const [errMsg, setErrMsg] = React.useState('');

	const submit = async () => {
		//console.log(meeting)
		if (!session.Start) {
			setErrMsg('Start date must be supplied');
			return;
		}
		if (!session.Name) {
			setErrMsg('Session name must be supplied');
			return;
		}
		await action === 'update'? updateSession(session.id, session): addSession(session);
		close();
	};

	const change = e => setSession(s => ({...s, [e.target.name]: e.target.value}));
	const changeDate = e => setSession(s => ({...s, [e.target.name]: new Date(e.target.value)}));
	const changeType = options => setSession(s => ({...s, Type: options.length? options[0].value: null}));
	const getTypeOption = session => MeetingTypeOptions.find(o => o.value === session.Type) || [];
	const changeTimeZone = tz => setSession(s => ({...s, TimeZone: tz}));

	const typeOption = MeetingTypeOptions.find(o => o.value === session.Type)

	const actionText = action === 'add'? 'Add': 'Update';

	return (
		<Form
			title={`${actionText} session`}
			submit={submit}
			submitLabel={actionText}
			cancel={close}
			errorText={errMsg}
			style={{width: 400}}
		>
			<Row>
				<Field label='Start:'>
					<Input type='date' size={24} name='Start' value={getDate(session.Start)} onChange={changeDate}/>
				</Field>
			</Row>
			<Row>
				<Field label='End:'>
					<Input type='date' size={24} name='End' value={getDate(session.End)} onChange={changeDate}/>
				</Field>
			</Row>
			<Row>
				<Field label='Name:'>
					<Input type='text' size={24} name='Name' value={session.Name} onChange={change}/>
				</Field>
			</Row>
			<Row>
				<Field label='Session type:' >
					<Select
						options={MeetingTypeOptions}
						values={typeOption? [typeOption]: []}
						onChange={changeType}
						portal={document.querySelector('#root')}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Time zone:'>
					<TimeZoneSelector
						value={session.TimeZone}
						onChange={changeTimeZone}
						style={{width: 200}}
					/>
				</Field>
			</Row>
		</Form>
	)
}

_SessionDialog.propTypes = {
	action: PropTypes.oneOf(['add', 'update', '']).isRequired,
	defaultValue: PropTypes.object.isRequired,
	close: PropTypes.func.isRequired,
	addSession: PropTypes.func.isRequired,
	updateSession: PropTypes.func.isRequired
}

const SessionDialog = connect(
	null,
	{addSession, updateSession}
)(_SessionDialog)

function SessionDialogModal({
	isOpen,
	action,
	session,
	close
}) {
	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<SessionDialog
				key={isOpen}		// remount on open
				action={action}
				defaultValue={session}
				close={close}
			/>
		</AppModal>
	)
}

export default SessionDialogModal;
