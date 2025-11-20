import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import {
	selectBallotParticipationState,
	selectSyncedBallotSeriesEntities,
} from "@/store/ballotParticipation";

export function useBallotSeriesParticipation() {
	const entities = useAppSelector(selectBallotParticipationState).entities;
	const ballotSeriesEntities = useAppSelector(
		selectSyncedBallotSeriesEntities
	);
	const ballotEntities = useAppSelector(selectBallotParticipationState)
		.ballots.entities;

	const getBallotParticipation = React.useCallback(
		(SAPIN: number) => {
			const entity = entities[SAPIN];
			if (entity) {
				return entity.ballotSeriesParticipationSummaries
					.slice(-3) // Last 3 ballot series
					.reverse();
			}
			return [];
		},
		[entities]
	);

	return {
		getBallotParticipation,
		ballotEntities,
		ballotSeriesEntities,
	};
}
