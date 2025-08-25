import { Row, Col, Button } from "react-bootstrap";
import {
	AppTable,
	SplitPanel,
	Panel,
	SelectHeaderCell,
	SelectCell,
	TableColumnSelector,
	SplitPanelButton,
	ColumnProperties,
	TablesConfig,
	TableConfig,
} from "@components/table";

import {
	fields,
	affiliationMapSelectors,
	affiliationMapActions,
} from "@/store/affiliationMap";
import { refresh } from "../members/loader";

import AffiliationMapDetail from "./AffiliationMapDetail";

const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={affiliationMapSelectors}
				actions={affiliationMapActions}
				{...p}
			/>
		),
	},
	{
		key: "match",
		...fields.match,
		width: 80,
		flexGrow: 1,
		flexShrink: 0,
	},
	{
		key: "shortAffiliation",
		...fields.shortAffiliation,
		width: 100,
		flexGrow: 1,
		flexShrink: 0,
	},
];

const defaultTablesConfig: TablesConfig = {};
const tableConfig: TableConfig = {
	fixed: false,
	columns: {},
};
for (const column of tableColumns) {
	const key = column.key;
	tableConfig.columns[key] = {
		unselectable: key.startsWith("__"),
		shown: true,
		width: column.width || 200,
	};
}
defaultTablesConfig["default"] = tableConfig;

function AffiliationMapUnit() {
	return (
		<>
			<Row className="w-100">
				<Col className="d-flex justify-content-end gap-2">
					<TableColumnSelector
						selectors={affiliationMapSelectors}
						actions={affiliationMapActions}
						columns={tableColumns}
					/>
					<SplitPanelButton
						selectors={affiliationMapSelectors}
						actions={affiliationMapActions}
					/>
					<Button
						variant="outline-primary"
						className="bi-arrow-repeat"
						title="Refresh"
						onClick={refresh}
					/>
				</Col>
			</Row>
			<SplitPanel
				selectors={affiliationMapSelectors}
				actions={affiliationMapActions}
			>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={32}
						estimatedRowHeight={32}
						measureRowHeight
						selectors={affiliationMapSelectors}
						actions={affiliationMapActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<AffiliationMapDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default AffiliationMapUnit;
