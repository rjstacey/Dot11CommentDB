import db from '../utils/database';
import { NotFoundError } from '../utils';

import { getSessions, Session } from './sessions';
import { getImatAttendanceSummary } from './imat';
import type { OkPacket } from 'mysql2';
import type { User } from './users';

type SessionAttendanceSummary = {
    id: number;
    /** Session identifier */
    session_id: number;
    /** Percentage of meeting slots attended */
    AttendancePercentage: number;
    /** Declare attendance criteria met */
    DidAttend: boolean;
    /** Declare attendance criteria not met */
    DidNotAttend: boolean;
    /** SA PIN under which attendance was logged */
    SAPIN: number;
    Notes: string;
}

type RecentSessionAttendances = {
    SAPIN: number;
    sessionAttendanceSummaries: SessionAttendanceSummary[];
}

/*
 * Get session attendance
 */
const getSessionAttendancesSQL = (session_ids: number[]) => 
    db.format(
        'SELECT ' +
            'SAPIN, ' +
            'JSON_ARRAYAGG(JSON_OBJECT(' +
                '"id", id, ' +
                '"session_id", session_id, ' +
                '"AttendancePercentage", AttendancePercentage, ' +
                '"DidAttend", DidAttend, ' + 
                '"DidNotAttend", DidNotAttend, ' +
                '"Notes", Notes' + 
            ')) as sessionAttendanceSummaries ' +
        'FROM attendance_summary a ' +
        'WHERE a.session_id IN (?) ' +
        'GROUP BY SAPIN ',
        [session_ids]);

export async function getRecentAttendances() {
    let attendances: RecentSessionAttendances[] = [],
        sessions: Session[] = [];

	const now = Date.now();
	const allSessions = (await getSessions())
		.filter(s => Date.parse(s.endDate) < now)
		.sort((s1, s2) => Date.parse(s1.startDate) - Date.parse(s2.startDate));	// Oldest to newest

	// Plenary sessions only, newest 4 with attendance
	let plenaries = allSessions
		.filter(s => s.type === 'p' && s.Attendees! > 0)
		.slice(-4);

	if (plenaries.length > 0) {
        /* Get attendance summary for recent sessions. Will include four most recent plenaries with attendance and
         * any interim sessions between the first of the four plenaries and the current date. */
	    let fromTimestamp = Date.parse(plenaries[0].startDate);

	    sessions = allSessions.filter(s => (s.type === 'i' || s.type === 'p') && Date.parse(s.startDate) >= fromTimestamp);

        const sql = getSessionAttendancesSQL(sessions.map(s => s.id));
        //console.log(sql)
        attendances = await db.query(sql) as RecentSessionAttendances[];
    }

    return {
        sessions,
        attendances
    }
}

export async function importAttendances(user: User, session_id: number) {

	let [session] = await getSessions({id: session_id});
	if (!session)
		throw new NotFoundError(`Session id=${session_id} does not exist`);

	const imatAttendances = await getImatAttendanceSummary(user, session);

	const attendances = imatAttendances.map(a => ({
        SAPIN: a.SAPIN,
        AttendancePercentage: a.AttendancePercentage
	}));

	await db.query('DELETE FROM attendance_summary WHERE session_id=?; ', [session_id]);
	if (attendances.length) {
		let sql =
			db.format('INSERT INTO attendance_summary (session_id, ??) VALUES ', [Object.keys(attendances[0])]) +
			attendances.map(a => db.format('(?, ?)', [session.id, Object.values(a)])).join(', ');
		await db.query(sql);
	}

	return getRecentAttendances();
}

function attendanceSummaryEntry(a: Partial<SessionAttendanceSummary>) {

	const entry = {
		session_id: a.session_id,
		SAPIN: a.SAPIN,
		AttendancePercentage: a.AttendancePercentage,
		DidAttend: a.DidAttend? 1: 0,
		DidNotAttend: a.DidNotAttend? 1: 0,
		Notes: a.Notes
	};

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	return entry;
}

type Update<T> = {
	id: number;
	changes: Partial<T>;
}

async function updateAttendance({id, changes}: Update<SessionAttendanceSummary>) {
    await db.query('UPDATE attendance_summary SET ? WHERE id=?', [changes, id]);
    const [attendance] = await db.query('SELECT * FROM attendance_summary WHERE id=?', [id]) as SessionAttendanceSummary[];
    return attendance;
}

export async function updateAttendances(updates: Update<SessionAttendanceSummary>[]) {
    const attendances = await Promise.all(updates.map(updateAttendance));
    return attendances;
}

async function addAttendance(attendance: SessionAttendanceSummary) {
    const {insertId} = await db.query('INSERT attendance_summary SET ?', [attendance]) as OkPacket;
    [attendance] = await db.query('SELECT * FROM attendance_summary WHERE id=?', [insertId]) as SessionAttendanceSummary[];
    return attendance;
}

export async function addAttendances(attendances: SessionAttendanceSummary[]) {
    attendances = await Promise.all(attendances.map(addAttendance));
    return attendances;
}

export async function deleteAttendances(ids: number[]) {
    const {affectedRows} = await db.query('DELETE FROM attendance_summary WHERE ID IN (?)', ids) as OkPacket;
    return affectedRows;
}
