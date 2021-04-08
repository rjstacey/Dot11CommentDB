import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import {AppModal} from 'dot11-common/modals'
import {Form, Row, Field, Input, Select} from 'dot11-common/general/Form'
import TimeZoneSelector from './TimeZoneSelector'
import {updateSession, addSession, MeetingTypeOptions} from '../store/sessions'

function getDate(d) {
	const s = typeof d === 'string'? d: d.toISOString()
	return s.substring(0, 10)
}

function _MeetingDialog({
	action,
	defaultValue,
	close,
	addSession,
	updateSession
}) {
	const [meeting, setMeeting] = React.useState(defaultValue);
	const [errMsg, setErrMsg] = React.useState('');

	const submit = async () => {
		//console.log(meeting)
		if (!meeting.Start) {
			setErrMsg('Start date must be supplied');
			return;
		}
		if (!meeting.Name) {
			setErrMsg('Session name must be supplied');
			return;
		}
		await action === 'update'? updateSession(meeting.id, meeting): addSession(meeting);
		close();
	};

	const change = e => setMeeting({...meeting, [e.target.name]: e.target.value});
	const changeDate = e => setMeeting({...meeting, [e.target.name]: new Date(e.target.value)})

	const changeType = options => {
		console.log(options)
		setMeeting({...meeting, Type: options.length? options[0].value: null});
	}
	const getTypeOption = meeting => MeetingTypeOptions.find(o => o.value === meeting.Type) || [];
	const changeTimeZone = tz => setMeeting({...meeting, TimeZone: tz});

	const typeOption = MeetingTypeOptions.find(o => o.value === meeting.Type)

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
					<Input type='date' size={24} name='Start' value={getDate(meeting.Start)} onChange={changeDate}/>
				</Field>
			</Row>
			<Row>
				<Field label='End:'>
					<Input type='date' size={24} name='End' value={getDate(meeting.End)} onChange={changeDate}/>
				</Field>
			</Row>
			<Row>
				<Field label='Name:'>
					<Input type='text' size={24} name='Name' value={meeting.Name} onChange={change}/>
				</Field>
			</Row>
			<Row>
				<Field label='Session type:' >
					<Select
						options={MeetingTypeOptions}
						values={typeOption? [typeOption]: []}
						onChange={changeType}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Time zone:'>
					<TimeZoneSelector
						value={meeting.TimeZone}
						onChange={changeTimeZone}
						style={{width: 200}}
					/>
				</Field>
			</Row>
		</Form>
	)
}

_MeetingDialog.propTypes = {
	action: PropTypes.oneOf(['add', 'update']),
	defaultValue: PropTypes.object.isRequired,
	close: PropTypes.func.isRequired,
	addSession: PropTypes.func.isRequired,
	updateSession: PropTypes.func.isRequired
}

const MeetingDialog = connect(
	null,
	{addSession, updateSession}
)(_MeetingDialog)

function MeetingDialogModal({
	isOpen,
	action,
	meeting,
	close
}) {
	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<MeetingDialog
				key={isOpen}		// remount on open
				action={action}
				defaultValue={meeting}
				close={close}
			/>
		</AppModal>
	)
}

export default MeetingDialogModal;
