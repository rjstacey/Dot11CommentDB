import * as React from "react";
import { useBallotParticipation } from "./useBallotParticipation";
import { renderBallotParticipation } from "./renderBallotParticipation";

export function useRenderBallotParticipation() {
	const { getBallotParticipation, ballotEntities, ballotSeriesEntities } =
		useBallotParticipation();

	return React.useCallback(
		(SAPIN: number) => {
			const summaries = getBallotParticipation(SAPIN);
			return renderBallotParticipation(
				summaries,
				ballotEntities,
				ballotSeriesEntities
			);
		},
		[getBallotParticipation, ballotEntities, ballotSeriesEntities]
	);
}
