import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import {
	selectSyncedBallotSeriesEntities,
	selectBallotParticipationEntities,
	selectBallotEntities,
} from "@/store/ballotParticipation";

export function useBallotParticipation() {
	const entities = useAppSelector(selectBallotParticipationEntities);
	const ballotSeriesEntities = useAppSelector(
		selectSyncedBallotSeriesEntities
	);
	const ballotEntities = useAppSelector(selectBallotEntities);

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
