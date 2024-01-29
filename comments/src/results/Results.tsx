import React from "react";

import {
	AppTable,
	TableColumnSelector,
	ActionButton,
	ColumnProperties,
	TablesConfig,
	ChangeableColumnProperties,
	CellRendererProps
} from "dot11-components";

import ProjectBallotSelector from "../components/ProjectBallotSelector";
import ResultsSummary from "./ResultsSummary";
import ResultsExport from "./ResultsExport";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import {
	loadResults,
	clearResults,
	selectResultsBallot_id,
	resultsSelectors,
	resultsActions,
	upsertTableColumns,
	selectResultsAccess,
} from "../store/results";
import { selectBallot, BallotType } from "../store/ballots";
import { selectIsOnline } from "../store/offline";

const lineTruncStyle: React.CSSProperties = {
	overflow: "hidden",
	whiteSpace: "nowrap",
	textOverflow: "ellipses",
};

const renderItem = ({
	rowData,
	dataKey,
}: CellRendererProps) => <div style={lineTruncStyle}>{rowData[dataKey]}</div>;

const tableColumns: ColumnProperties[] = [
	{ key: "SAPIN", label: "SA PIN", width: 75 },
	{ key: "Name", label: "Name", width: 200, cellRenderer: renderItem },
	{
		key: "Affiliation",
		label: "Affiliation",
		width: 200,
		cellRenderer: renderItem,
	},
	{ key: "Email", label: "Email", width: 250, cellRenderer: renderItem },
	{ key: "Vote", label: "Vote", width: 210 },
	{ key: "CommentCount", label: "Comments", width: 110 },
	{ key: "Notes", label: "Notes", width: 250, flexShrink: 1, flexGrow: 1 },
];

function getDefaultTablesConfig(access: number, type: number): TablesConfig {
	const columns = tableColumns.reduce((o, c) => {
		let columnConfig: ChangeableColumnProperties = {
			shown: true,
			width: c.width!,
			unselectable: false,
		};
		if (
			c.key === "SAPIN" &&
			(access < AccessLevel.admin || type === BallotType.SA)
		) {
			columnConfig = {
				...columnConfig,
				shown: false,
				unselectable: false,
			};
		}
		if (c.key === "Email" && access < AccessLevel.admin) {
			columnConfig = {
				...columnConfig,
				shown: false,
				unselectable: false,
			};
		}
		o[c.key] = columnConfig;
		return o;
	}, {} as { [key: string]: ChangeableColumnProperties });
	return { default: { fixed: false, columns } };
}

function updateTableConfigAction(access: number, type: number) {
	if (access < AccessLevel.admin)
		return upsertTableColumns({
			columns: { SAPIN: { shown: false }, Email: { shown: false } },
		});

	if (type === BallotType.SA)
		return upsertTableColumns({
			columns: { SAPIN: { shown: false }, Email: { shown: true } },
		});

	return upsertTableColumns({
		columns: { SAPIN: { shown: true }, Email: { shown: true } },
	});
}

const maxWidth = 1600;

function Results() {
	const dispatch = useAppDispatch();

	const isOnline = useAppSelector(selectIsOnline);

	const access = useAppSelector(selectResultsAccess);
	const resultsBallot_id = useAppSelector(selectResultsBallot_id);
	const resultsBallot = useAppSelector((state) =>
		resultsBallot_id ? selectBallot(state, resultsBallot_id) : undefined
	);

	const defaultTablesConfig = React.useMemo(() => {
		if (resultsBallot)
			return getDefaultTablesConfig(access, resultsBallot.Type);
	}, [access, resultsBallot]);

	React.useEffect(() => {
		if (resultsBallot)
			dispatch(updateTableConfigAction(access, resultsBallot.Type));
	}, [dispatch, access, resultsBallot]);

	const refresh = () =>
		dispatch(
			resultsBallot_id ? loadResults(resultsBallot_id) : clearResults()
		);

	return (
		<>
			<div className="top-row" style={{ maxWidth }}>
				<ProjectBallotSelector />
				<div style={{ display: "flex" }}>
					<ResultsExport ballot={resultsBallot} />
					<TableColumnSelector
						selectors={resultsSelectors}
						actions={resultsActions}
						columns={tableColumns}
					/>
					<ActionButton
						name="refresh"
						title="Refresh"
						disabled={!isOnline}
						onClick={refresh}
					/>
				</div>
			</div>
			<ResultsSummary style={{ maxWidth }} />
			<div className="table-container centered-rows" style={{ maxWidth }}>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={28}
					estimatedRowHeight={32}
					selectors={resultsSelectors}
					actions={resultsActions}
				/>
			</div>
		</>
	);
}

export default Results;
