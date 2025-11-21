import * as React from "react";
import {
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	CellRendererProps,
	TablesConfig,
	TableConfig,
	IdSelector,
} from "@common";
import { useAppSelector } from "@/store/hooks";
import {
	ballotParticipationSelectors,
	ballotParticipationActions,
	selectSyncedBallotSeriesEntities,
	selectBallotSeriesIds,
	type RecentBallotSeriesParticipation,
	type BallotSeriesParticipationSummary,
} from "@/store/ballotParticipation";
import {
	renderNameAndEmail,
	renderHeaderNameAndEmail,
} from "../members/tableColumns";

const renderBallotSeriesParticipationSummary = (
	summary?: BallotSeriesParticipationSummary
) => {
	let voteSummary = "Not in pool";
	const excused = "";
	if (summary) {
		voteSummary = summary.vote ? summary.vote : "Did not vote";
		if (summary.commentCount) voteSummary += `/${summary.commentCount}`;
	}

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<span>{voteSummary}</span>
			<span>{excused}</span>
		</div>
	);
};

const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 60,
		flexGrow: 1,
		flexShrink: 0,
		headerRenderer: (p) => (
			<SelectHeaderCell
				customSelectorElement=<IdSelector
					dataKey="SAPIN"
					style={{ width: "400px" }}
					selectors={ballotParticipationSelectors}
					actions={ballotParticipationActions}
					focusOnMount
				/>
				{...p}
			/>
		),
		cellRenderer: (p) => (
			<SelectCell
				selectors={ballotParticipationSelectors}
				actions={ballotParticipationActions}
				{...p}
			/>
		),
	},
	{ key: "SAPIN", label: "SA PIN", width: 80, flexGrow: 1, flexShrink: 1 },
	{
		key: "Name",
		label: "Name",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderNameAndEmail,
		cellRenderer: renderNameAndEmail,
	},
	{
		key: "Affiliation",
		label: "Affiliation",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
	},
	{ key: "Status", label: "Status", width: 150, flexGrow: 1, flexShrink: 1 },
	{
		key: "ExpectedStatus",
		label: "Expected status",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "Summary",
		label: "Summary",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
];

export function useTableColumns() {
	const ballotSeriesIds = useAppSelector(selectBallotSeriesIds);
	const ballotSeriesEntities = useAppSelector(
		selectSyncedBallotSeriesEntities
	);

	const columns = React.useMemo(() => {
		return tableColumns.concat(
			ballotSeriesIds.map((id, i) => {
				const ballotSeries = ballotSeriesEntities[id as number]!;
				const cellRenderer = ({
					rowData,
				}: CellRendererProps<RecentBallotSeriesParticipation>) => {
					const summary =
						rowData.ballotSeriesParticipationSummaries.find(
							(s) => s.series_id === ballotSeries.id
						);
					return renderBallotSeriesParticipationSummary(summary);
				};
				const column = {
					key: "ballotSeries_" + i,
					label: ballotSeries.project,
					width: 200,
					flexGrow: 1,
					flexShrink: 1,
					cellRenderer,
				};
				return column;
			})
		);
	}, [ballotSeriesIds, ballotSeriesEntities]);

	const defaultTablesConfig = React.useMemo(() => {
		const defaultTablesConfig: TablesConfig = {};
		const tableView = "default";
		const tableConfig: TableConfig = {
			fixed: false,
			columns: {},
		};
		for (const column of columns) {
			const key = column.key;
			tableConfig.columns[key] = {
				unselectable: key.startsWith("__"),
				shown: true,
				width: column.width || 200,
			};
		}
		defaultTablesConfig[tableView] = tableConfig;
		return defaultTablesConfig;
	}, [columns]);

	return [columns, defaultTablesConfig] as const;
}
