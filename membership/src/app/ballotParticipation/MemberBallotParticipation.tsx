import * as React from "react";

import {
	Col,
	Checkbox,
	displayDateRange,
	shallowDiff,
	useDebounce,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	getBallotId,
	selectBallotParticipationState,
	selectMemberBallotParticipationCount,
	updateBallotParticipation,
	BallotSeriesParticipationSummary,
	selectSyncedBallotSeriesEntities,
} from "@/store/ballotParticipation";

import {
	EditTable as Table,
	renderTable,
	TableColumn,
} from "@/components/Table";

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

const ballotSeriesParticipationColumns: TableColumn[] = [
	{ key: "project", label: "Project" },
	{ key: "ballotIds", label: "Ballot series" },
	{ key: "period", label: "Period" },
	{ key: "voteSummary", label: "Last vote" },
	{
		key: "excused",
		label: "Excused",
		styleCell: { justifyContent: "center" },
	},
	{ key: "SAPIN", label: "SA PIN" },
];

function MemberBallotParticipation({
	SAPIN,
	readOnly,
}: {
	SAPIN: number;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();

	const { count, total } = useAppSelector((state) =>
		selectMemberBallotParticipationCount(state, SAPIN)
	);

	const entities = useAppSelector(selectBallotParticipationState).entities;
	const ballotSeriesEntities = useAppSelector(
		selectSyncedBallotSeriesEntities
	);
	const ballotEntities = useAppSelector(selectBallotParticipationState)
		.ballots.entities;

	const [currentSAPIN, setCurrentSAPIN] = React.useState(SAPIN);
	const [editedIds, setEditedIds] = React.useState<number[]>([]);
	const [editedParticipation, setEditedParticipation] = React.useState<
		Record<number, BallotSeriesParticipationSummary>
	>({});
	const [savedParticipation, setSavedParticipation] = React.useState<
		Record<number, BallotSeriesParticipationSummary>
	>({});

	const values = editedIds.map((id) => editedParticipation[id]);

	const triggerSave = useDebounce(() => {
		const updates = [];
		for (const id of editedIds) {
			const changes = shallowDiff(
				savedParticipation[id],
				editedParticipation[id]
			) as Partial<BallotSeriesParticipationSummary>;
			if (Object.keys(changes).length > 0) updates.push({ id, changes });
		}
		if (updates.length > 0)
			dispatch(updateBallotParticipation(currentSAPIN, updates));
		setSavedParticipation(editedParticipation);
	});

	React.useEffect(() => {
		const participation: Record<number, BallotSeriesParticipationSummary> =
			{};
		const ids: number[] = [];
		const entity = entities[SAPIN];
		if (entity) {
			for (const summary of entity.ballotSeriesParticipationSummaries) {
				participation[summary.series_id] = summary;
				ids.push(summary.series_id);
			}
		}
		setCurrentSAPIN(SAPIN);
		setEditedIds(ids);
		setEditedParticipation(participation);
		setSavedParticipation(participation);
	}, [
		SAPIN,
		entities,
		setCurrentSAPIN,
		setEditedIds,
		setEditedParticipation,
		setSavedParticipation,
	]);

	const columns = React.useMemo(() => {
		function update(
			id: number,
			changes: Partial<BallotSeriesParticipationSummary>
		) {
			console.log(id, changes);
			setEditedParticipation((entities) => ({
				...entities,
				[id]: { ...entities[id], ...changes },
			}));
			triggerSave();
		}

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

		return ballotSeriesParticipationColumns.map((col) => {
			let renderCell:
				| ((
						entry: BallotSeriesParticipationSummary
				  ) => JSX.Element | string | number)
				| undefined;
			if (col.key === "project")
				renderCell = (entry) =>
					ballotSeriesEntities[entry.series_id]?.project || "?";
			if (col.key === "ballotIds")
				renderCell = (entry) =>
					ballotSeriesEntities[entry.series_id]?.ballotNames.join(
						", "
					) || "?";
			if (col.key === "period") renderCell = renderDateRange;
			if (col.key === "excused") {
				renderCell = (entry) => (
					<Checkbox
						checked={entry.excused}
						onChange={(e) =>
							update(entry.series_id, {
								excused: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "voteSummary") {
				renderCell = renderVoteSummary;
			}
			if (col.key === "SAPIN") {
				renderCell = (entry) =>
					(entry.SAPIN !== entry.lastSAPIN && entry.lastSAPIN) || "";
			}

			if (renderCell) return { ...col, renderCell };

			return col;
		});
	}, [
		ballotEntities,
		ballotSeriesEntities,
		readOnly,
		setEditedParticipation,
		triggerSave,
	]);

	return (
		<Col>
			<label>{`Recent ballot series participation: ${count}/${total}`}</label>
			<Table columns={columns} values={values} />
		</Col>
	);
}

export default MemberBallotParticipation;
