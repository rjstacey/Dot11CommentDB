import React from "react";
import { displayDateRange } from "@common";

import { useAppSelector } from "@/store/hooks";
import type { User } from "@/store";
import { selectMostRecentAttendedSession } from "@/store/sessions";
import { fields, getField, type Member } from "@/store/members";
import type { EmailTemplate } from "@/store/emailTemplates";

import { useRenderSessionParticipation } from "@/app/sessionParticipation/useRenderSessionParticipation";
import { useRenderBallotParticipation } from "@/app/ballotParticipation/useRenderBallotParticipation";
import { htmlWithInlineStyle } from "@/components/editor/utils";

export const genEmailAddress = (m: Member | User) => `${m.Name} <${m.Email}>`;

const SELECTED_MEMBERS = "SelectedMembers";
export const SELECTED_MEMBERS_KEY = `{{${SELECTED_MEMBERS}}}`;

export const substitutionTags = Object.keys(fields).concat(
	"SessionName",
	"SessionNumber",
	"SessionDate"
);

const SUBSTITUTION_TAG_PATTERN = "{{([A-Za-z_-]+)}}";

export function useEmailSubstitution() {
	const session = useAppSelector(selectMostRecentAttendedSession);
	const renderSessionParticipation = useRenderSessionParticipation();
	const renderBallotParticipation = useRenderBallotParticipation();

	const substitute = React.useCallback(
		(key: string, member: Member): string => {
			if (Object.keys(member).includes(key))
				return "" + member[key as keyof Member] || "(Blank)";

			if (key === "OldStatus")
				return "" + (getField(member, key) || "(Blank)");

			if (key === "AttendancesSummary")
				return renderSessionParticipation(member.SAPIN);

			if (key.startsWith("Session")) {
				if (!session) return "(Blank)";
				let s = "";
				if (key === "SessionName") s = session.name;
				if (key === "SessionNumber") s = "" + session.number;
				if (key === "SessionDate")
					s = displayDateRange(session.startDate, session.endDate);
				return s || "(Blank)";
			}

			if (key === "BallotParticipationSummary")
				return renderBallotParticipation(member.SAPIN);

			console.log(`Error: Invalid key {{${key}}}`);

			return "";
		},
		[session, renderSessionParticipation, renderBallotParticipation]
	);

	return React.useCallback(
		(email: EmailTemplate, member: Member) => {
			let to = email.to || SELECTED_MEMBERS_KEY;
			to = to.replace(SELECTED_MEMBERS_KEY, genEmailAddress(member));
			email = { ...email, to };

			if (email.cc) {
				const cc = email.cc.replace(
					SELECTED_MEMBERS_KEY,
					genEmailAddress(member)
				);
				email = { ...email, cc };
			}

			if (email.bcc) {
				const bcc = email.bcc.replace(
					SELECTED_MEMBERS_KEY,
					genEmailAddress(member)
				);
				email = { ...email, bcc };
			}

			let bodyRemaining = email.body;
			let body = "";
			const regexp = new RegExp(SUBSTITUTION_TAG_PATTERN);
			while (bodyRemaining.length > 0) {
				const match = regexp.exec(bodyRemaining);
				if (match === null) break;
				body += bodyRemaining.substring(0, match.index);
				body += substitute(match[1], member);
				bodyRemaining = bodyRemaining.substring(
					match.index + match[0].length
				);
			}
			body += bodyRemaining;

			body = htmlWithInlineStyle(body);
			email = { ...email, body };
			return email;
		},
		[substitute]
	);
}
