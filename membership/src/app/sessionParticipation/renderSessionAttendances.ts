import * as React from "react";

import { displayDateRange } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	selectMemberAttendances,
	getNullAttendanceSummary,
} from "@/store/attendanceSummaries";
import { selectSessionParticipationSessionIds } from "@/store/sessionParticipation";
import { selectSessionEntities, Session } from "@/store/sessions";

import { renderTable } from "@/components/renderTable";

const headings = ["Session", "Attendance", "Notes"];

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
