import React from "react";

import {
	Col,
	Checkbox,
	Input,
	displayDateRange,
	shallowDiff,
	useDebounce,
} from "dot11-components";

import type { RootState } from "../store";
import { selectMemberAttendanceStats } from "../store/sessionParticipation";
import {
	selectMemberAttendances,
	selectAttendanceSummarySessionIds,
	updateAttendanceSummaries,
	getNullAttendanceSummary,
	SessionAttendanceSummary,
	MemberSessionAttendanceSummaries,
	isNullAttendanceSummary,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryUpdate,
	addAttendanceSummaries,
	deleteAttendanceSummaries,
} from "../store/attendanceSummary";
import { selectSessionEntities, Session } from "../store/sessions";

import styles from "../sessionAttendance/sessionAttendance.module.css";

import {
	EditTable as Table,
	TableColumn,
	renderTable,
} from "../components/Table";
import { useAppDispatch, useAppSelector } from "../store/hooks";

function renderSessionSummary(session: Session | undefined) {
	if (!session) return "Unknown";
	return `
			<span>
				${session.number}
				${session.type === "p" ? "Plenary: " : "Interim: "}
				${displayDateRange(session.startDate, session.endDate)}
			</span><br>
			<span style="font-size: 12px">${session.name}</span>
	`;
}

const headings = ["Session", "Attendance", "Notes"];

function useSessionAttendances(SAPIN: number) {
	const sessionIds = useAppSelector(selectAttendanceSummarySessionIds);
	const membersAttendances = useAppSelector(selectMemberAttendances);

	return React.useMemo(() => {
		const session_ids = sessionIds as number[];
		const attendances = membersAttendances[SAPIN] || {};

		return {
			session_ids,
			attendances,
		};
	}, [SAPIN, sessionIds, membersAttendances]);
}

export function useRenderSessionAttendances() {
	const sessionIds = useAppSelector(selectAttendanceSummarySessionIds);
	const sessionEntities = useAppSelector(selectSessionEntities);
	const membersAttendances = useAppSelector(selectMemberAttendances);

	return React.useCallback(
		(SAPIN: number) => {
			const session_ids = sessionIds as number[];
			const values = session_ids.map((id) => {
				const session = sessionEntities[id]!;
				const attendances = membersAttendances[SAPIN];
				let a = attendances[id] || getNullAttendanceSummary(id, SAPIN);

				let notes = "";
				if (a.DidAttend) notes = "Override: did attend";
				else if (a.DidNotAttend) notes = "Override: did not attend";
				if (a.SAPIN !== SAPIN) {
					if (notes) notes += "; ";
					notes += `Attended using SAPIN=${a.SAPIN}`;
				}

				return [
					renderSessionSummary(session),
					(a.AttendancePercentage || 0).toFixed(1) + "%",
					notes,
				];
			});

			return renderTable(headings, values);
		},
		[sessionIds, sessionEntities, membersAttendances]
	);
}

const attendancesColumns: TableColumn[] = [
	{ key: "Session", label: "Session" },
	{
		key: "AttendancePercentage",
		label: "Attendance",
		styleCell: { justifyContent: "flex-end" },
	},
	{
		key: "IsRegistered",
		label: "Registered",
		styleCell: { justifyContent: "center" },
	},
	{
		key: "InPerson",
		label: "In-person",
		styleCell: { justifyContent: "center" },
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
	readOnly,
}: {
	SAPIN: number;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();

	const sessionEntities = useAppSelector(selectSessionEntities);

	const { session_ids, attendances } = useSessionAttendances(SAPIN);

	const [editedSessionIds, setEditedSessionIds] =
		React.useState<number[]>(session_ids);
	const [editedAttendances, setEditedAttendances] =
		React.useState<MemberSessionAttendanceSummaries>(attendances);
	const [savedAttendances, setSavedAttendances] =
		React.useState<MemberSessionAttendanceSummaries>(attendances);

	const selectAttendanceStats = React.useCallback(
		(state: RootState) => selectMemberAttendanceStats(state, SAPIN),
		[SAPIN]
	);
	const { count, total } = useAppSelector(selectAttendanceStats);

	const values = editedSessionIds.map(
		(session_id) =>
			editedAttendances[session_id] ||
			getNullAttendanceSummary(session_id, SAPIN)
	);

	const triggerSave = useDebounce(() => {
		const updates: SessionAttendanceSummaryUpdate[] = [];
		const adds: SessionAttendanceSummaryCreate[] = [];
		const deletes: number[] = [];
		for (const session_id of editedSessionIds) {
			const changes = shallowDiff(
				savedAttendances[session_id],
				editedAttendances[session_id]
			) as Partial<SessionAttendanceSummary>;
			if (Object.keys(changes).length > 0) {
				const updated = { ...savedAttendances[session_id], changes };
				if (updated.id) {
					if (isNullAttendanceSummary(updated))
						deletes.push(updated.id);
					else updates.push({ id: updated.id, changes });
				} else if (!isNullAttendanceSummary(updated)) {
					adds.push(updated);
				}
			}
		}
		if (adds.length > 0) dispatch(addAttendanceSummaries(adds));
		if (updates.length > 0) dispatch(updateAttendanceSummaries(updates));
		if (deletes.length > 0) dispatch(deleteAttendanceSummaries(deletes));
		setSavedAttendances(editedAttendances);
	});

	React.useEffect(() => {
		setEditedSessionIds(session_ids);
		setEditedAttendances(attendances);
		setSavedAttendances(attendances);
	}, [
		session_ids,
		attendances,
		setEditedSessionIds,
		setEditedAttendances,
		setSavedAttendances,
	]);

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

		function update(
			session_id: number,
			changes: Partial<SessionAttendanceSummary>
		) {
			setEditedAttendances((attendances) => ({
				...attendances,
				[session_id]: { ...attendances[session_id], ...changes },
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
					`${(entry.AttendancePercentage || 0).toFixed(0)}%`;
			if (col.key === "IsRegistered") {
				renderCell = (entry) => (
					<Checkbox
						checked={entry.IsRegistered}
						onChange={(e) =>
							update(entry.session_id, {
								IsRegistered: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "InPerson") {
				renderCell = (entry) => (
					<Checkbox
						checked={entry.InPerson}
						onChange={(e) =>
							update(entry.session_id, {
								InPerson: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
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
