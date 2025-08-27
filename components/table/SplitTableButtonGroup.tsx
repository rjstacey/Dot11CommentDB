import TableViewSelector from "./TableViewSelector";
import TableColumnSelector from "./TableColumnSelector";
import { SplitPanelButton } from "./SplitPanel";

import type { ColumnProperties } from "./AppTable";
import type {
	AppTableDataSelectors,
	AppTableDataActions,
} from "../store/appTableData";
import React from "react";

type SplitTableButtonGroupProps = {
	columns: Array<ColumnProperties>;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
	style?: React.CSSProperties;
};

export function SplitTableButtonGroup({
	columns,
	selectors,
	actions,
	style,
}: SplitTableButtonGroupProps) {
	return (
		<div className="d-flex align-items-center gap-2" style={style}>
			<div>Table view</div>
			<TableViewSelector selectors={selectors} actions={actions} />
			<TableColumnSelector
				columns={columns}
				selectors={selectors}
				actions={actions}
			/>
			<SplitPanelButton selectors={selectors} actions={actions} />
		</div>
	);
}

export default SplitTableButtonGroup;
