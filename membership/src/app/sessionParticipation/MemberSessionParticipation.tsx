import * as React from "react";
import { Button, FormCheck, FormControl } from "react-bootstrap";
import { shallowDiff, useDebounce } from "@common";

import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectMemberAttendanceStats,
	selectSessionParticipationSessionIds,
} from "@/store/sessionParticipation";
import {
	selectMemberAttendances,
	updateAttendanceSummaries,
	getNullAttendanceSummary,
	SessionAttendanceSummary,
	MemberSessionAttendanceSummaries,
	isNullAttendanceSummary,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryUpdate,
	addAttendanceSummaries,
	deleteAttendanceSummaries,
} from "@/store/attendanceSummaries";
import { selectSessionEntities } from "@/store/sessions";

import { EditTable as Table, TableColumn } from "@/components/Table";

import { renderSessionInfo } from "@/components/renderSessionInfo";
import { useRenderSessionAttendances } from "./renderSessionAttendances";

function useSessionAttendances(SAPIN: number) {
	const sessionIds = useAppSelector(selectSessionParticipationSessionIds);
	const membersAttendances = useAppSelector(selectMemberAttendances);

	return React.useMemo(() => {
		const session_ids = sessionIds as number[];
		const attendances = { ...membersAttendances[SAPIN] };

		for (const session_id of session_ids) {
			if (!attendances[session_id]) {
				attendances[session_id] = getNullAttendanceSummary(
					session_id,
					SAPIN
				);
			}
		}

		return {
			session_ids,
			attendances,
		};
	}, [SAPIN, sessionIds, membersAttendances]);
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

export function MemberSessionParticipation({
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
				const updated = { ...savedAttendances[session_id], ...changes };
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
				renderCell = (entry) =>
					renderSessionInfo(sessionEntities[entry.session_id]);
			if (col.key === "AttendancePercentage")
				renderCell = (entry) =>
					`${(entry.AttendancePercentage || 0).toFixed(0)}%`;
			if (col.key === "IsRegistered") {
				renderCell = (entry) => (
					<FormCheck
						id={"is-registered-" + entry.session_id}
						checked={entry.IsRegistered || false}
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
					<FormCheck
						id={"in-person-" + entry.session_id}
						checked={entry.InPerson || false}
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
					<FormCheck
						id={"did-attend-" + entry.session_id}
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
					<FormCheck
						id={"did-not-attend-" + entry.session_id}
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
					<FormControl
						id={"notes-" + entry.session_id}
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

	const renderSessionAttendances = useRenderSessionAttendances();
	function copyToClipboard() {
		const html = renderSessionAttendances(SAPIN);
		const type = "text/html";
		const blob = new Blob([html], { type });
		const data = [new ClipboardItem({ [type]: blob })];
		navigator.clipboard.write(data);
	}

	return (
		<>
			<div className="d-flex align-items-center justify-content-between">
				<div>{`Recent session attendance: ${count} / ${total}`}</div>
				<Button
					variant="outline-primary"
					className="bi-copy"
					title="Copy to clipboard"
					onClick={copyToClipboard}
				/>
			</div>
			<Table columns={columns} values={values} />
		</>
	);
}
