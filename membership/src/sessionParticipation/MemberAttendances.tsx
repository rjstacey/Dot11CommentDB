import * as React from "react";

import {
	Col,
	Checkbox,
	Input,
	displayDateRange,
	shallowDiff,
	useDebounce,
} from "dot11-components";

import type { RootState } from "../store";
import {
	selectAttendancesEntities,
	selectMemberAttendanceStats,
	selectAttendanceSessionIds,
	updateAttendances,
	type SessionAttendanceSummary,
} from "../store/sessionParticipation";
import { selectSessionEntities } from "../store/sessions";

import styles from "../sessionAttendance/sessionAttendance.module.css";

import { EditTable as Table, TableColumn } from "../components/Table";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const attendancesColumns: TableColumn[] = [
	{ key: "Session", label: "Session" },
	{
		key: "AttendancePercentage",
		label: "Attendance",
		styleCell: { justifyContent: "flex-end" },
	},
	{
		key: "DidAttend",
		label: "Did attend",
		styleCell: { justifyContent: "center" },
	},
	{
		key: "DidNotAttend",
		label: "Did not attend",
		styleCell: { justifyContent: "center" },
	},
	{ key: "Notes", label: "Notes" },
	{
		key: "SAPIN",
		label: "SA PIN",
		styleCell: { justifyContent: "flex-end" },
	},
];

function MemberAttendances({
	SAPIN,
	readOnly
}: {
	SAPIN: number;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();

	const sessionIds = useAppSelector(selectAttendanceSessionIds);
	const sessionEntities = useAppSelector(selectSessionEntities);
	const attendancesEntities = useAppSelector(selectAttendancesEntities);

	const [editedSAPIN, setEditedSAPIN] = React.useState<number>(SAPIN);
	const [editedSessionIds, setEditedSessionIds] = React.useState<number[]>([]);
	const [editedAttendances, setEditedAttendances] = React.useState<Record<number, SessionAttendanceSummary>>({});
	const [savedAttendances, setSavedAttendances] = React.useState<Record<number, SessionAttendanceSummary>>({});

	const selectAttendanceStats = React.useCallback((state: RootState) => selectMemberAttendanceStats(state, SAPIN), [SAPIN]);
	const { count, total } = useAppSelector(selectAttendanceStats);

	const values = editedSessionIds.map((session_id) => editedAttendances[session_id]);

	React.useEffect(() => {
		const session_ids = sessionIds.slice().reverse() as number[];
		const attendances: Record<number, SessionAttendanceSummary> = {};
		for (const session_id of session_ids) {
			const sessionAttendances =
				attendancesEntities[SAPIN]?.sessionAttendanceSummaries || [];
			let a = sessionAttendances.find((a) => a.session_id === session_id);
			if (!a) {
				// No entry for this session; generate a "null" entry
				a = {
					id: 0,
					session_id,
					AttendancePercentage: 0,
					DidAttend: false,
					DidNotAttend: false,
					Notes: "",
					SAPIN,
					CurrentSAPIN: SAPIN
				};
			}
			attendances[session_id] = a;
		}
		setEditedSAPIN(SAPIN);
		setEditedSessionIds(session_ids);
		setEditedAttendances(attendances);
		setSavedAttendances(attendances);
	}, [sessionIds, SAPIN, attendancesEntities, setEditedSAPIN, setEditedSessionIds, setEditedAttendances, setSavedAttendances]);

	const triggerSave = useDebounce(() => {
		const updates = [];
		for (const session_id of editedSessionIds) {
			const changes = shallowDiff(
				savedAttendances[session_id],
				editedAttendances[session_id]
			) as Partial<SessionAttendanceSummary>;
			if (Object.keys(changes).length > 0)
				updates.push({ session_id, changes });
		}
		if (updates.length > 0) dispatch(updateAttendances(editedSAPIN, updates));
		setSavedAttendances(editedAttendances);
	});

	const columns = React.useMemo(() => {
		function renderSessionSummary(id: number) {
			const session = sessionEntities[id];
			if (!session) return "Unknown";
			return (
				<div className={styles.sessionItem}>
					<span>
						{session.number}{" "}
						{session.type === "p" ? "Plenary: " : "Interim: "}{" "}
						{displayDateRange(session.startDate, session.endDate)}
					</span>
					<span>{session.name}</span>
				</div>
			);
		}

		function update(session_id: number,	changes: Partial<SessionAttendanceSummary>) {
			setEditedAttendances(attendances => ({
				...attendances,
				[session_id]: {...attendances[session_id], ...changes}
			}));
			triggerSave();
		}

		return attendancesColumns.map((col) => {
			let renderCell:
				| ((
						entry: SessionAttendanceSummary
				  ) => JSX.Element | string | number)
				| undefined;
			if (col.key === "Session")
				renderCell = (entry) => renderSessionSummary(entry.session_id);
			if (col.key === "AttendancePercentage")
				renderCell = (entry) =>
					`${entry.AttendancePercentage.toFixed(0)}%`;
			if (col.key === "DidAttend") {
				renderCell = (entry) => (
					<Checkbox
						checked={entry.DidAttend}
						onChange={(e) =>
							update(entry.session_id, {
								DidAttend: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "DidNotAttend") {
				renderCell = (entry) => (
					<Checkbox
						checked={entry.DidNotAttend}
						onChange={(e) =>
							update(entry.session_id, {
								DidNotAttend: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "Notes") {
				renderCell = (entry) => (
					<Input
						type="text"
						value={entry.Notes || ""}
						onChange={(e) =>
							update(entry.session_id, {
								Notes: e.target.value,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "SAPIN") {
				renderCell = (entry) =>
					entry.SAPIN !== entry.CurrentSAPIN ? entry.SAPIN : "";
			}

			if (renderCell) return { ...col, renderCell };

			return col;
		});
	}, [sessionEntities, readOnly, setEditedAttendances, triggerSave]);

	return (
		<Col>
			<label>{`Recent session attendance: ${count}/${total}`}</label>
			<Table columns={columns} values={values} />
		</Col>
	);
}

export default MemberAttendances;
