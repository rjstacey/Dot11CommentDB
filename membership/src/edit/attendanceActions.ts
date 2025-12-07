import React from "react";
import type { EntityId } from "@reduxjs/toolkit";
import { Multiple, shallowDiff } from "@common";

import type { AppThunk } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import {
	isNullAttendanceSummary,
	updateAttendanceSummaries,
	addAttendanceSummaries,
	deleteAttendanceSummaries,
	SessionAttendanceSummary,
	SessionAttendanceSummaryChange,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryUpdate,
} from "@/store/attendanceSummaries";

export type MultipleSessionAttendanceSummary =
	Multiple<SessionAttendanceSummary>;

export function useAttendanceUpdate() {
	const dispatch = useAppDispatch();
	return React.useCallback(
		async (
			attendances: SessionAttendanceSummary[],
			edited?: MultipleSessionAttendanceSummary,
			saved?: MultipleSessionAttendanceSummary
		) => {
			const changes =
				edited && saved
					? (shallowDiff(
							saved,
							edited
						) as SessionAttendanceSummaryChange)
					: {};
			const p: AppThunk[] = [];
			const updates: SessionAttendanceSummaryUpdate[] = [];
			const adds: SessionAttendanceSummaryCreate[] = [];
			const deletes: EntityId[] = [];
			if (Object.keys(changes).length > 0) {
				for (const a of attendances) {
					const entry = { ...a, ...changes };
					if (entry.id) {
						if (isNullAttendanceSummary(a)) deletes.push(entry.id);
						else updates.push({ id: entry.id, changes });
					} else {
						if (!isNullAttendanceSummary(a)) adds.push(entry);
					}
				}
				if (adds.length > 0) p.push(addAttendanceSummaries(adds));
				if (updates.length > 0)
					p.push(updateAttendanceSummaries(updates));
				if (deletes.length > 0)
					p.push(deleteAttendanceSummaries(deletes));
			}
			await Promise.all(p.map(dispatch));
		},
		[dispatch]
	);
}
