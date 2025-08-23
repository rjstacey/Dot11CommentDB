import React from "react";
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
} from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import {
	fields,
	groupsSelectors,
	groupsActions,
	type GroupWithOfficers,
} from "@/store/groups";
import { selectMemberEntities } from "@/store/members";

import GroupDetail from "./GroupDetail";
import { refresh } from "./loader";

function GroupOfficers({ group }: { group: GroupWithOfficers }) {
	const { officers } = group;
	const members = useAppSelector(selectMemberEntities);

	return (
		<div style={{ display: "grid", gridTemplateColumns: "150px auto" }}>
			{officers.map((officer) => {
				const member = members[officer.sapin];
				const name = member ? member.Name : "";
				return (
					<React.Fragment key={officer.id}>
						<div>{officer.position}</div>
						<div>{name}</div>
					</React.Fragment>
				);
			})}
		</div>
	);
}

const renderName = ({ rowData }: { rowData: GroupWithOfficers }) => (
	<div style={{ background: rowData.color || "transparent" }}>
		{rowData.name}
	</div>
);

const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={groupsSelectors}
				actions={groupsActions}
				{...p}
			/>
		),
	},
	{
		key: "name",
		...fields.name,
		width: 80,
		flexGrow: 1,
		flexShrink: 0,
		cellRenderer: renderName,
	},
	{ key: "type", ...fields.type, width: 100, flexGrow: 1, flexShrink: 0 },
	{ key: "status", ...fields.status, width: 60, flexGrow: 1, flexShrink: 0 },
	{
		key: "officers",
		label: "Officers",
		cellRenderer: ({ rowData }) => <GroupOfficers group={rowData} />,
		width: 400,
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

function Organization() {
	return (
		<>
			<Row className="w-100">
				<Col className="d-flex justify-content-end">
					<TableColumnSelector
						selectors={groupsSelectors}
						actions={groupsActions}
						columns={tableColumns}
					/>
					<SplitPanelButton
						selectors={groupsSelectors}
						actions={groupsActions}
					/>
					<Button
						variant="outline-primary"
						className="bi-arrow-repeat"
						title="Refresh"
						onClick={refresh}
					/>
				</Col>
			</Row>
			<SplitPanel selectors={groupsSelectors} actions={groupsActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={32}
						estimatedRowHeight={32}
						measureRowHeight
						selectors={groupsSelectors}
						actions={groupsActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<GroupDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default Organization;
