import { BallotParticipationActions } from "./actions";
import { BallotParticipationTable } from "./table";

export function BallotParticipationLayout() {
	return (
		<>
			<BallotParticipationActions />
			<BallotParticipationTable />
		</>
	);
}
