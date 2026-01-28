import * as React from "react";
import { Dictionary } from "@reduxjs/toolkit";

import { useAppSelector } from "@/store/hooks";
import {
	getNullAttendanceSummary,
	selectMemberAttendances,
	SessionAttendanceSummary,
} from "@/store/attendanceSummaries";
import { selectSessionParticipationSessionIds } from "@/store/sessionParticipation";
import { selectSessionEntities, type Session } from "@/store/sessions";

import { renderSessionInfoHtml } from "@/components/renderSessionInfo";
import { renderTable } from "@/components/renderTable";

export function renderSessionParticipation(
	SAPIN: number,
	session_ids: number[],
	sessionEntities: Dictionary<Session>,
	attendances: Record<number, SessionAttendanceSummary>,
) {
	const headings = ["Session", "Attendance", "Notes"];
	const values = session_ids.map((id) => {
		const session = sessionEntities[id];
		const a = attendances[id] || getNullAttendanceSummary(id, SAPIN);

		let notes = a.Notes || "";
		if (a.DidAttend) {
			if (notes) notes += "; ";
			notes += "Override: did attend";
		} else if (a.DidNotAttend) {
			if (notes) notes += "; ";
			notes += "Override: did not attend";
		}
		if (a.SAPIN !== SAPIN) {
			if (notes) notes += "; ";
			notes += `Attended using SAPIN=${a.SAPIN}`;
		}

		return [
			renderSessionInfoHtml(session),
			(a.AttendancePercentage || 0).toFixed(1) + "%",
			notes,
		];
	});

	return renderTable(headings, values);
}

export function useRenderSessionParticipation() {
	const sessionIds = useAppSelector(selectSessionParticipationSessionIds);
	const sessionEntities = useAppSelector(selectSessionEntities);
	const attendances = useAppSelector(selectMemberAttendances);

	return React.useCallback(
		(SAPIN: number) =>
			renderSessionParticipation(
				SAPIN,
				sessionIds as number[],
				sessionEntities,
				attendances[SAPIN] || {},
			),
		[sessionIds, sessionEntities, attendances],
	);
}
