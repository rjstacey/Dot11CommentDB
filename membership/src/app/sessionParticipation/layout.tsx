import { SessionParticipationActions } from "./actions";
import { SessionParticipationTable } from "./main";

export function SessionParticipationLayout() {
	return (
		<>
			<SessionParticipationActions />
			<SessionParticipationTable />
		</>
	);
}
