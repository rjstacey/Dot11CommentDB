import * as React from "react";

import { useAppSelector } from "@/store/hooks";
import {
	selectMemberAttendances,
	getNullAttendanceSummary,
} from "@/store/attendanceSummaries";
import { selectSessionParticipationSessionIds } from "@/store/sessionParticipation";
import { selectSessionEntities } from "@/store/sessions";

import { renderTable } from "@/components/renderTable";
import { renderSessionInfoHtml } from "@/components/renderSessionInfo";

const headings = ["Session", "Attendance", "Notes"];

export function useRenderSessionAttendances() {
	const sessionIds = useAppSelector(selectSessionParticipationSessionIds);
	const sessionEntities = useAppSelector(selectSessionEntities);
	const membersAttendances = useAppSelector(selectMemberAttendances);

	return React.useCallback(
		(SAPIN: number) => {
			const session_ids = sessionIds as number[];
			const attendances = membersAttendances[SAPIN] || {};

			const values = session_ids.map((id) => {
				const session = sessionEntities[id]!;
				const a =
					attendances[id] || getNullAttendanceSummary(id, SAPIN);

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
		},
		[sessionIds, sessionEntities, membersAttendances]
	);
}
