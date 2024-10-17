import { useNavigate } from "react-router-dom";

import { ActionButton, displayDateRange } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { selectRecentSessions } from "../store/sessions";

import BulkStatusUpdate from "./BulkStatusUpdate";
import { SessionParticipationTableActions } from "./table";

function SessionSummary() {
	const sessions = useAppSelector(selectRecentSessions);

	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				overflow: "auto",
				margin: "10px 0",
			}}
		>
			{sessions.map((session) => (
				<div
					key={session.id}
					style={{
						display: "flex",
						flexDirection: "column",
						margin: 5,
					}}
				>
					<div style={{ whiteSpace: "nowrap" }}>
						{session.number}{" "}
						{session.type === "p" ? "Plenary: " : "Interim: "}{" "}
						{displayDateRange(session.startDate, session.endDate)}
					</div>
					<div
						style={{
							whiteSpace: "nowrap",
							textOverflow: "ellipsis",
							overflow: "hidden",
							maxWidth: 200,
						}}
					>
						{session.name}
					</div>
					<div style={{ display: "flex" }}>
						<div>{`(${session.attendees} attendees)`}</div>
					</div>
				</div>
			))}
		</div>
	);
}

function SessionPartipationActions() {
	const navigate = useNavigate();
	const refresh = () => navigate(0);

	return (
		<>
			<div className="top-row">
				<SessionSummary />
			</div>
			<div className="top-row justify-right">
				<div className="control-group">
					<BulkStatusUpdate isSession={true} />
					<SessionParticipationTableActions />
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
					/>
				</div>
			</div>
		</>
	);
}

export default SessionPartipationActions;
