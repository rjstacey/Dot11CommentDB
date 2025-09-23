import { Multiple } from "@common";
import { Ballot, BallotChange } from "@/store/ballots";

import { BallotGroupRow } from "./BallotGroupRow";
import { BallotProjectRow } from "./BallotProjectRow";
import { BallotDatesRows } from "./BallotDatesRows";
import { BallotTypeRow } from "./BallotTypeRow";
import { BallotStageRow } from "./BallotStageRow";
import { BallotSeriesRow } from "./BallotSeriesRow";
import { BallotEpollRow } from "./BallotEpollRow";
import { BallotDocumentRow } from "./BallotDocumentRow";

export function BallotEdit({
	ballot,
	original,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	original?: Multiple<Ballot>;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<BallotGroupRow
				ballot={ballot}
				original={original}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
			<BallotProjectRow
				ballot={ballot}
				original={original}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
			<BallotDocumentRow
				ballot={ballot}
				original={original}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
			<BallotTypeRow
				ballot={ballot}
				original={original}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
			<BallotStageRow
				ballot={ballot}
				original={original}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
			<BallotSeriesRow
				ballot={ballot}
				original={original}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
			<BallotDatesRows
				ballot={ballot}
				original={original}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
			<BallotEpollRow
				ballot={ballot}
				original={original}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
		</>
	);
}
