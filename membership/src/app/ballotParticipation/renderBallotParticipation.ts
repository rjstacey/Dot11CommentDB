import * as React from "react";
import { displayDateRange } from "@common";
import { renderTable } from "@/components/renderTable";
import { useAppSelector } from "@/store/hooks";
import {
	getBallotId,
	selectBallotParticipationState,
	selectSyncedBallotSeriesEntities,
	BallotSeriesParticipationSummary,
} from "@/store/ballotParticipation";

const headings = ["Project", "Ballot series", "Period", "Last vote", "Notes"];

export function useRenderBallotParticipation() {
	const entities = useAppSelector(selectBallotParticipationState).entities;
	const ballotSeriesEntities = useAppSelector(
		selectSyncedBallotSeriesEntities
	);
	const ballotEntities = useAppSelector(selectBallotParticipationState)
		.ballots.entities;

	return React.useCallback(
		(SAPIN: number) => {
			let values: string[][] = [];
			const entity = entities[SAPIN];
			if (entity) {
				function renderDateRange(
					entity: BallotSeriesParticipationSummary
				) {
					const ballotSeries =
						ballotSeriesEntities[entity.series_id]!;
					return displayDateRange(
						ballotSeries.start,
						ballotSeries.end
					);
				}

				function renderVoteSummary(
					entity: BallotSeriesParticipationSummary
				) {
					if (!entity.lastBallotId) return "Did not vote";
					const ballot = ballotEntities[entity.lastBallotId];
					const ballotName = ballot ? getBallotId(ballot) : "?";
					return (
						`${ballotName}/${entity.vote}` +
						(entity.commentCount ? `/${entity.commentCount}` : "")
					);
				}

				values = entity.ballotSeriesParticipationSummaries.map(
					(entry) => {
						let notes = "";
						if (entry.excused) notes = "Excused";
						else if (
							entry.SAPIN !== entry.lastSAPIN &&
							entry.lastSAPIN
						)
							notes = "Voted using SAPIN=" + entry.lastSAPIN;
						const ballotSeries =
							ballotSeriesEntities[entry.series_id];
						const project = ballotSeries?.project || "?";
						const ballotSeriesText =
							ballotSeries?.ballotNames.join(", ") || "?";
						return [
							project,
							ballotSeriesText,
							renderDateRange(entry),
							renderVoteSummary(entry),
							notes,
						];
					}
				);
			}

			return renderTable(headings, values);
		},
		[entities, ballotSeriesEntities, ballotEntities]
	);
}
