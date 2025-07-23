import { createSelector, EntityId, Dictionary } from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import { selectMeetingEntities, type Meeting } from "@/store/meetings";
import {
	selectBreakoutMeeting,
	selectBreakoutIds,
	selectBreakoutEntities,
	selectBreakoutTimeslots,
	type Breakout,
	type ImatTimeslot,
} from "@/store/imatBreakouts";
import { selectMeetingAttendanceCountsByBreakout } from "@/store/imatMeetingAttendance";
import { Group, selectGroupEntities } from "@/store/groups";

import { SyncedImatMeeting } from "@/store/imatMeetings";

export type BreakoutAttendanceEntry = {
	label: string;
	date: string;
	slotName: string;
	startTime: string;
	color: string;
	attendanceCount: number;
};

function generateBreakoutAttendanceEntries(
	imatMeeting: SyncedImatMeeting | undefined,
	breakoutIds: EntityId[],
	breakoutEntities: Dictionary<Breakout>,
	timeslots: ImatTimeslot[],
	meetingEntities: Dictionary<Meeting>,
	groupEntities: Dictionary<Group>,
	attendanceCountEntities: Record<number, number>
): BreakoutAttendanceEntry[] {
	const groups = Object.values(groupEntities) as Group[];
	if (!imatMeeting) {
		return [];
	}
	const startDate = imatMeeting.start;
	const entries: BreakoutAttendanceEntry[] = [];

	// Create series entities from breakouts
	breakoutIds.forEach((breakoutId) => {
		const breakout = breakoutEntities[breakoutId]!;
		const meeting = Object.values(meetingEntities).find(
			(m) => m?.imatBreakoutId === breakoutId
		);
		let group: Group | undefined, isCancelled: boolean, label: string;
		if (meeting) {
			// If there is a meeting associated with the breakout, then use information from the meeting
			isCancelled =
				meeting.isCancelled ||
				breakout.name.search(/cancelled|canceled/i) >= 0;
			group = meeting.organizationId
				? groupEntities[meeting.organizationId]
				: undefined;
			label = meeting.summary;
		} else {
			// If there is no meeting, try to figure things out
			isCancelled = breakout.name.search(/cancelled|canceled/i) >= 0;
			let groupName = breakout.name;
			const m = groupName.match(/(cancelled|canceled)[-\s]*(.*)/i);
			if (m) groupName = m[2];

			group = groups.find((g) => g.name === groupName);
			if (!group)
				group = groups.find((g) => g.name.startsWith(groupName));
			label = groupName;
		}
		if (!isCancelled) {
			const attendanceCount = attendanceCountEntities[breakout.id] || 0;
			const slot = timeslots.find(
				(slot) => slot.id === breakout.startSlotId
			);
			const color = group?.color || "yellow";
			if (attendanceCount && slot) {
				const date = DateTime.fromISO(startDate).plus({
					days: breakout.day,
				});
				const entry = {
					label,
					date: "" + date.toISODate(),
					slotName: slot.name,
					startTime: slot.startTime,
					color,
					attendanceCount,
				};
				entries.push(entry);
			}
		}
	});

	return entries;
}

export const selectBreakoutAttendanceEntries = createSelector(
	selectBreakoutMeeting,
	selectBreakoutIds,
	selectBreakoutEntities,
	selectBreakoutTimeslots,
	selectMeetingEntities,
	selectGroupEntities,
	selectMeetingAttendanceCountsByBreakout,
	generateBreakoutAttendanceEntries
);
