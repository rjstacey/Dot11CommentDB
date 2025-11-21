import React from "react";
import { displayDateRange } from "@common";
import { type Session } from "@/store/sessions";

const sessionDescStyle: React.CSSProperties = {
	overflow: "hidden",
	whiteSpace: "nowrap",
	textOverflow: "ellipsis",
};

const sessionNameStyle: React.CSSProperties = {
	fontStyle: "italic",
	fontSize: "smaller",
};

export function renderSessionInfoHtml(session: Session | undefined) {
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

export function renderSessionInfo(session: Session | undefined) {
	if (!session) return "Unknown";
	return (
		<div style={sessionDescStyle}>
			<span>
				{session.number}{" "}
				{session.type === "p" ? "Plenary: " : "Interim: "}
				{displayDateRange(session.startDate, session.endDate)}
			</span>
			<br />
			<span style={sessionNameStyle}>{session.name}</span>
		</div>
	);
}
