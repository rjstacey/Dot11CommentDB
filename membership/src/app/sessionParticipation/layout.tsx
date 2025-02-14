import { SessionParticipationActions } from "./actions";
import { SessionParticipationTable } from "./table";

export function SessionParticipationLayout() {
	return (
		<>
			<SessionParticipationActions />
			<SessionParticipationTable />
		</>
	);
}
