import React from "react";
import {
	AppTable,
	ShowFilters,
	GlobalFilter,
	SplitPanel,
	Panel,
	SplitTableButtonGroup,
} from "dot11-components";

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
			<div
				style={{ width: "100%", display: "flex", alignItems: "center" }}
			>
				<ShowFilters
					selectors={myProjectRosterSelectors}
					actions={myProjectRosterActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={myProjectRosterSelectors}
					actions={myProjectRosterActions}
				/>
			</div>

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
