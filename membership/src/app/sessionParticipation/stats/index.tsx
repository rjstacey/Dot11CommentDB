import React from "react";
import { useAppSelector } from "@/store/hooks";
import {
	selectSessionParticipationIds,
	selectSessionParticipationWithMembershipAndSummary,
} from "@/store/sessionParticipation";
import { EditTable, TableColumn } from "@/components/Table";
import SessionsSelector from "./sessionsSelector";

type TableEntries = {
	numAttended: string | number;
	count: number;
};
function InPersonAttendance() {
	const ids = useAppSelector(selectSessionParticipationIds);
	const entities = useAppSelector(
		selectSessionParticipationWithMembershipAndSummary
	);
	//const sessions = useAppSelector(selectRecentSessions).slice(0, 1);
	const [selected, setSelected] = React.useState<number[]>([]);

	const inPersonStats: Record<number, number> = {};
	const remoteStats: Record<number, number> = {};
	const totalStats: Record<number, number> = {};
	for (let i = 0; i < selected.length + 1; i++) {
		inPersonStats[i] = 0;
		remoteStats[i] = 0;
		totalStats[i] = 0;
	}
	let numAttendees = 0;
	for (const sapin of ids) {
		const m = entities[sapin];
		let inPersonCount = 0,
			remoteCount = 0,
			totalCount = 0;
		const attendanceSummaries = m.sessionAttendanceSummaries.filter(
			(a) =>
				selected.includes(a.session_id) &&
				(a.AttendancePercentage || 0) > 0
		);
		if (attendanceSummaries.length === 0) continue;
		numAttendees++;
		for (const a of attendanceSummaries) {
			if (a.InPerson) inPersonCount++;
			else remoteCount++;
			totalCount++;
		}
		inPersonStats[inPersonCount]++;
		remoteStats[remoteCount]++;
		totalStats[totalCount]++;
	}

	const columns: TableColumn[] = [
		{ key: "numAttended", label: "Number of sessions attended" },
		{ key: "count", label: "Count" },
	];
	const inPersonValues: TableEntries[] = [];
	const remoteValues: TableEntries[] = [];
	const totalValues: TableEntries[] = [];
	let atLeastOneInPersonCount = 0;
	let atLeastOneRemoteCount = 0;
	for (let i = 0; i < selected.length + 1; i++) {
		const entry1: TableEntries = {
			numAttended: i,
			count: inPersonStats[i],
		};
		inPersonValues.push(entry1);
		if (i > 0) atLeastOneInPersonCount += inPersonStats[i];
		const entry2: TableEntries = {
			numAttended: i,
			count: totalStats[i],
		};
		totalValues.push(entry2);
		const entry3: TableEntries = {
			numAttended: i,
			count: remoteStats[i],
		};
		remoteValues.push(entry3);
		if (i > 0) atLeastOneRemoteCount += remoteStats[i];
	}
	inPersonValues.push({
		numAttended: "At least one",
		count: atLeastOneInPersonCount,
	});
	remoteValues.push({
		numAttended: "At least one",
		count: atLeastOneRemoteCount,
	});
	totalValues.push({
		numAttended: "Number of unique attendees",
		count: numAttendees,
	});

	return (
		<>
			<SessionsSelector selected={selected} setSelected={setSelected} />
			<div style={{ display: "flex" }}>
				<div>
					<h1>Overall</h1>
					<EditTable columns={columns} values={totalValues} />
				</div>
				<div>
					<h1>In-Person</h1>
					<EditTable columns={columns} values={inPersonValues} />
				</div>
				<div>
					<h1>Remote</h1>
					<EditTable columns={columns} values={remoteValues} />
				</div>
			</div>
		</>
	);
}

function Stats() {
	return <InPersonAttendance />;
}

export default Stats;
