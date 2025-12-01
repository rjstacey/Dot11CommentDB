import * as React from "react";
import { Button, FormCheck, Row, Col } from "react-bootstrap";
import { displayDateRange } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	getBallotId,
	selectMemberBallotParticipationCount,
	selectSyncedBallotSeriesEntities,
	selectBallotEntities,
	BallotSeriesParticipationSummary,
} from "@/store/ballotParticipation";

import { EditTable as Table, TableColumn } from "@/components/Table";

import { renderBallotParticipation } from "../../ballotParticipation/renderBallotParticipation";

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

export function MemberBallotParticipationTable({
	series_ids,
	edited,
	onChange,
	ballotEntities,
	ballotSeriesEntities,
	readOnly,
}: {
	series_ids: number[];
	edited: Record<number, BallotSeriesParticipationSummary>;
	onChange: (
		series_id: number,
		changes: Partial<BallotSeriesParticipationSummary>
	) => void;
	ballotEntities: Record<
		number,
		ReturnType<typeof selectBallotEntities>[number]
	>;
	ballotSeriesEntities: Record<
		number,
		ReturnType<typeof selectSyncedBallotSeriesEntities>[number]
	>;
	readOnly?: boolean;
}) {
	const columns = React.useMemo(() => {
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
							onChange(entry.series_id, {
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
	}, [ballotEntities, ballotSeriesEntities, readOnly, onChange]);

	const values = series_ids.map((series_id) => edited[series_id]);

	return (
		<Row>
			<Table columns={columns} values={values} />
		</Row>
	);
}

export function MemberBallotParticipationEdit({
	SAPIN,
	series_ids,
	edited,
	onChange,
	readOnly,
}: {
	SAPIN: number;
	series_ids: number[];
	edited: Record<number, BallotSeriesParticipationSummary>;
	onChange: (
		series_id: number,
		changes: Partial<BallotSeriesParticipationSummary>
	) => void;
	readOnly?: boolean;
}) {
	const ballotEntities = useAppSelector(selectBallotEntities);
	const ballotSeriesEntities = useAppSelector(
		selectSyncedBallotSeriesEntities
	);
	const { count, total } = useAppSelector((state) =>
		selectMemberBallotParticipationCount(state, SAPIN)
	);

	function copyToClipboard() {
		const html = renderBallotParticipation(
			series_ids,
			edited,
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
			<Row className="d-flex align-items-center justify-content-between">
				<Col>{`Recent ballot series participation: ${count} / ${total}`}</Col>
				<Col xs="auto">
					<Button
						variant="outline-primary"
						className="bi-copy"
						title="Copy to clipboard"
						onClick={copyToClipboard}
					/>
				</Col>
			</Row>
			<MemberBallotParticipationTable
				series_ids={series_ids}
				edited={edited}
				onChange={onChange}
				ballotEntities={ballotEntities}
				ballotSeriesEntities={ballotSeriesEntities}
				readOnly={readOnly}
			/>
		</>
	);
}
