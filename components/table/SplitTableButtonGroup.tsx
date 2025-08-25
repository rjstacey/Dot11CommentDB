import TableViewSelector from "./TableViewSelector";
import TableColumnSelector from "./TableColumnSelector";
import { SplitPanelButton } from "./SplitPanel";

import type { ColumnProperties } from "./AppTable";
import type {
	AppTableDataSelectors,
	AppTableDataActions,
} from "../store/appTableData";

type SplitTableButtonGroupProps = {
	columns: Array<ColumnProperties>;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
};

export function SplitTableButtonGroup({
	columns,
	selectors,
	actions,
}: SplitTableButtonGroupProps) {
	return (
		<div className="d-flex align-items-center gap-2">
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
