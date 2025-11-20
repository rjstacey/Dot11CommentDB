import * as React from "react";
import { Button, FormCheck } from "react-bootstrap";
import { displayDateRange, shallowDiff, useDebounce } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	getBallotId,
	selectMemberBallotParticipationCount,
	updateBallotParticipation,
	BallotSeriesParticipationSummary,
} from "@/store/ballotParticipation";

import { EditTable as Table, TableColumn } from "@/components/Table";

import { useBallotSeriesParticipation } from "./useBallotSeriesParticipation";
import { renderBallotParticipation } from "./renderBallotParticipation";

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

	const { getBallotParticipation, ballotEntities, ballotSeriesEntities } =
		useBallotSeriesParticipation();

	React.useEffect(() => {
		const summaries = getBallotParticipation(SAPIN);
		// Normalize
		const entities: Record<number, BallotSeriesParticipationSummary> = {};
		const ids: number[] = [];
		for (const summary of summaries) {
			entities[summary.series_id] = summary;
			ids.push(summary.series_id);
		}
		setCurrentSAPIN(SAPIN);
		setEditedIds(ids);
		setEditedParticipation(entities);
		setSavedParticipation(entities);
	}, [
		SAPIN,
		getBallotParticipation,
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
					<FormCheck
						id={"excused-" + entry.series_id}
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

	function copyToClipboard() {
		const summaries = getBallotParticipation(SAPIN);
		const html = renderBallotParticipation(
			summaries,
			ballotEntities,
			ballotSeriesEntities
		);
		const type = "text/html";
		const blob = new Blob([html], { type });
		const data = [new ClipboardItem({ [type]: blob })];
		navigator.clipboard.write(data);
	}

	return (
		<>
			<div className="d-flex align-items-center justify-content-between">
				<div>{`Recent ballot series participation: ${count}/${total}`}</div>
				<Button
					variant="outline-primary"
					className="bi-copy"
					title="Copy to clipboard"
					onClick={copyToClipboard}
				/>
			</div>
			<Table columns={columns} values={values} />
		</>
	);
}

export default MemberBallotParticipation;
