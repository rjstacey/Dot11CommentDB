import type { EntityId } from "@reduxjs/toolkit";
import { DateTime } from "luxon";
import { shallowDiff } from "dot11-components";

import type { AppThunk } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import {
	isNullAttendanceSummary,
	updateAttendanceSummaries,
	addAttendanceSummaries,
	deleteAttendanceSummaries,
	SessionAttendanceSummary,
	SessionAttendanceSummaryChanges,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryUpdate,
} from "@/store/attendanceSummary";
import {
	MemberCreate,
	ContactEmail,
	ContactInfo,
	memberContactInfoEmpty,
	StatusChangeEntry,
} from "@/store/members";
import type { Session } from "@/store/sessions";
import type { SessionAttendee } from "@/store/sessionAttendees";

import type { MultipleSessionAttendanceSummary } from "./detail";

/** Create a new member from attendee */
export function sessionAttendeeToNewMember(
	attendee: SessionAttendee,
	session: Session
) {
	const date = DateTime.fromISO(session.startDate, {
		zone: session.timezone,
	}).toISO()!;
	const status = "Non-Voter";
	const contactEmail: ContactEmail = {
		id: 0,
		Email: attendee.Email,
		Primary: true,
		Broken: false,
		DateAdded: date,
	};
	const contactInfo: ContactInfo =
		attendee.ContactInfo || memberContactInfoEmpty;
	const statusChange: StatusChangeEntry = {
		id: 0,
		OldStatus: status,
		NewStatus: status,
		Reason: "New member",
		Date: date,
	};
	const member: MemberCreate = {
		SAPIN: attendee.SAPIN,
		Name: attendee.Name,
		FirstName: attendee.FirstName,
		LastName: attendee.LastName,
		MI: attendee.MI,
		Email: attendee.Email,
		Affiliation: attendee.Affiliation,
		Employer: attendee.Employer || "",
		ContactInfo: contactInfo,
		ContactEmails: [contactEmail],
		Status: status,
		StatusChangeOverride: false,
		StatusChangeDate: date,
		StatusChangeHistory: [statusChange],
		DateAdded: date,
	};

	return member;
}

export function useAttendanceUpdate() {
	const dispatch = useAppDispatch();
	return async (
		edited: MultipleSessionAttendanceSummary,
		saved: MultipleSessionAttendanceSummary,
		attendances: SessionAttendanceSummary[]
	) => {
		const changes = shallowDiff(
			saved,
			edited
		) as SessionAttendanceSummaryChanges;
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
					adds.push(a);
				}
			}
			if (adds.length > 0) p.push(addAttendanceSummaries(adds));
			if (updates.length > 0) p.push(updateAttendanceSummaries(updates));
			if (deletes.length > 0) p.push(deleteAttendanceSummaries(deletes));
		}
		await Promise.all(p.map(dispatch));
	};
}
