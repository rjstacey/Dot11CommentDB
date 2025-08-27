import * as React from "react";
import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	ShowFilters,
	GlobalFilter,
	SplitPanel,
	Panel,
	SplitTableButtonGroup,
} from "@components/table";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	fields,
	selectMyProjectRosterState,
	setSelected,
	myProjectRosterSelectors,
	myProjectRosterActions,
} from "@/store/myProjectRoster";

import { MemberDetail } from "../detail";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export const RosterTableActions = (
	props: Omit<
		React.ComponentProps<typeof SplitTableButtonGroup>,
		"columns" | "selectors" | "actions"
	>
) => (
	<SplitTableButtonGroup
		columns={tableColumns}
		selectors={myProjectRosterSelectors}
		actions={myProjectRosterActions}
		{...props}
	/>
);

export function RosterTable() {
	const dispatch = useAppDispatch();
	const { selected } = useAppSelector(selectMyProjectRosterState);

	return (
		<div className="table-container">
			<Row className="align-items-center w-100">
				<Col>
					<ShowFilters
						selectors={myProjectRosterSelectors}
						actions={myProjectRosterActions}
						fields={fields}
					/>
				</Col>
				<Col xs={3} sm={2}>
					<GlobalFilter
						selectors={myProjectRosterSelectors}
						actions={myProjectRosterActions}
					/>
				</Col>
			</Row>

			<SplitPanel
				selectors={myProjectRosterSelectors}
				actions={myProjectRosterActions}
			>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={50}
						estimatedRowHeight={50}
						selectors={myProjectRosterSelectors}
						actions={myProjectRosterActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<MemberDetail
						selected={selected}
						setSelected={(ids) => dispatch(setSelected(ids))}
					/>
				</Panel>
			</SplitPanel>
		</div>
	);
}

export default RosterTable;
