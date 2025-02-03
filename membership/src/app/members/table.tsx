import * as React from "react";
import {
	AppTable,
	ShowFilters,
	GlobalFilter,
	SplitPanel,
	Panel,
	SplitTableButtonGroup,
} from "dot11-components";

import MemberDetail from "./MemberDetail";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	fields,
	selectMembersState,
	setSelected,
	membersSelectors,
	membersActions,
} from "@/store/members";

import { tableColumns, defaultTablesConfig } from "./membersTableColumns";

export const MembersTableActions = (
	props: Omit<
		React.ComponentProps<typeof SplitTableButtonGroup>,
		"columns" | "selectors" | "actions"
	>
) => (
	<SplitTableButtonGroup
		columns={tableColumns}
		selectors={membersSelectors}
		actions={membersActions}
		{...props}
	/>
);

function MembersTable() {
	const dispatch = useAppDispatch();
	const { selected } = useAppSelector(selectMembersState);

	return (
		<div className="table-container">
			<div
				style={{ width: "100%", display: "flex", alignItems: "center" }}
			>
				<ShowFilters
					selectors={membersSelectors}
					actions={membersActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={membersSelectors}
					actions={membersActions}
				/>
			</div>

			<SplitPanel selectors={membersSelectors} actions={membersActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={50}
						estimatedRowHeight={50}
						selectors={membersSelectors}
						actions={membersActions}
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

export default MembersTable;
