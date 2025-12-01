import { displayDateRange } from "@common";
import { renderTable } from "@/components/renderTable";
import {
	getBallotId,
	BallotSeriesParticipationSummary,
	Ballot,
	SyncedBallotSeries,
} from "@/store/ballotParticipation";
import { Dictionary } from "@reduxjs/toolkit";

export function renderBallotParticipation(
	series_ids: number[],
	participation: Record<number, BallotSeriesParticipationSummary>,
	ballotEntities: Dictionary<Ballot>,
	ballotSeriesEntities: Record<number, SyncedBallotSeries>
) {
	const headings = [
		"Project",
		"Ballot series",
		"Period",
		"Last vote",
		"Notes",
	];
	const values = series_ids.map((id) => {
		const entry = participation[id];

		function renderDateRange(entity: BallotSeriesParticipationSummary) {
			const ballotSeries = ballotSeriesEntities[entity.series_id]!;
			return displayDateRange(ballotSeries.start, ballotSeries.end);
		}

		function renderVoteSummary(entity: BallotSeriesParticipationSummary) {
			if (!entity.lastBallotId) return "Did not vote";
			const ballot = ballotEntities[entity.lastBallotId];
			const ballotName = ballot ? getBallotId(ballot) : "?";
			return (
				`${ballotName}/${entity.vote}` +
				(entity.commentCount ? `/${entity.commentCount}` : "")
			);
		}
		let notes = "";
		if (entry.excused) notes = "Excused";
		else if (entry.SAPIN !== entry.lastSAPIN && entry.lastSAPIN)
			notes = "Voted using SAPIN=" + entry.lastSAPIN;
		const ballotSeries = ballotSeriesEntities[entry.series_id];
		const project = ballotSeries?.project || "?";
		const ballotSeriesText = ballotSeries?.ballotNames.join(", ") || "?";
		return [
			project,
			ballotSeriesText,
			renderDateRange(entry),
			renderVoteSummary(entry),
			notes,
		];
	});
	return renderTable(headings, values);
}
