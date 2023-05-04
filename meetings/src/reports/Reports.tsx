import React from 'react';

import { ActionButton, Button } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import { selectCurrentImatMeeting } from '../store/imatMeetings';

import {
    loadImatMeetingAttendance,
    clearImatMeetingAttendance,
    selectAttendanceMeetingId,
} from '../store/imatMeetingAttendance';


import CurrentSessionSelector from '../components/CurrentSessionSelector';
import TopRow from '../components/TopRow';
import SessionAttendanceChart from './SessionAttendanceChart';
import TeleconAttendanceChart from './TeleconAttendanceChart';

const actions = [
    "sessionAttendance",
    "teleconAttendance"
] as const;

type Action = typeof actions[number];

const reports: { [ K in Action ]: string } = {
    sessionAttendance: "Session attendance",
    teleconAttendance: "Telecon attendance",
}

function ReportsNav({
    action,
    setAction
}: {
    action: Action | null;
    setAction: (action: Action | null) => void;
}) {
    function handleAction(newAction: Action) {
        setAction(newAction === action? null: newAction);
    }
    return (
        <div
            style={{display: 'flex', flexDirection: 'column', padding: '10px'}}
        >
            {actions.map(a =>
                <Button
                    key={a}
                    onClick={() => handleAction(a)}
                    isActive={action === a}
                >
                    {reports[a]}
                </Button>)}
        </div>
    )
}

function Reports() {
    const dispatch = useAppDispatch();

	const imatMeeting = useAppSelector(selectCurrentImatMeeting);
    const imatMeetingId = useAppSelector(selectAttendanceMeetingId);
    React.useEffect(() => {
        if (imatMeeting && imatMeeting.id !== imatMeetingId)
            dispatch(loadImatMeetingAttendance(imatMeeting.id));
    }, [imatMeeting, imatMeetingId, dispatch]);

    const refresh = () => imatMeeting? dispatch(loadImatMeetingAttendance(imatMeeting.id)): dispatch(clearImatMeetingAttendance());

    const [action, setAction] = React.useState<Action | null>(null);

    return (
        <>
            <TopRow>
                <CurrentSessionSelector />

				<div style={{display: 'flex'}}>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>
            <div style={{width: '80vw', flex: 1, padding: 20, display: 'flex', overflow: 'hidden'}}>
                <ReportsNav
                    action={action}
                    setAction={setAction}
                />
                {action === "sessionAttendance" && <SessionAttendanceChart style={{flex: 1}}/>}
                {action === "teleconAttendance" && <TeleconAttendanceChart style={{flex: 1}}/>}
            </div>
        </>
    )
}

export default Reports;
