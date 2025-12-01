import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import {
	selectSyncedBallotSeriesEntities,
	selectBallotEntities,
	selectBallotParticipationEntities,
	BallotSeriesParticipationSummary,
} from "@/store/ballotParticipation";
import { renderBallotParticipation } from "./renderBallotParticipation";

export function useRenderBallotParticipation() {
	const ballotEntities = useAppSelector(selectBallotEntities);
	const ballotSeriesEntities = useAppSelector(
		selectSyncedBallotSeriesEntities
	);
	const entities = useAppSelector(selectBallotParticipationEntities);
	return React.useCallback(
		(SAPIN: number) => {
			const series_ids: number[] = [];
			const participation: Record<
				number,
				BallotSeriesParticipationSummary
			> = {};
			entities[SAPIN]?.ballotSeriesParticipationSummaries
				.slice(-3) // Last 3 ballot series
				.reverse()
				.forEach((summary) => {
					const id = summary.series_id;
					series_ids.push(id);
					participation[id] = summary;
				});
			return renderBallotParticipation(
				series_ids,
				participation,
				ballotEntities,
				ballotSeriesEntities
			);
		},
		[entities, ballotEntities, ballotSeriesEntities]
	);
}
