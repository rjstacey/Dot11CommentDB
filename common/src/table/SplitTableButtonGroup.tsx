import React from "react";
import { Col } from "react-bootstrap";
import TableViewSelector from "./TableViewSelector";
import TableColumnSelector from "./TableColumnSelector";
import { SplitPanelButton } from "./SplitPanel";
import type { ColumnProperties } from "./AppTable";
import type {
	AppTableDataSelectors,
	AppTableDataActions,
} from "../store/appTableData";

export function SplitTableButtonGroup({
	columns,
	selectors,
	actions,
	className,
	...props
}: {
	columns: ColumnProperties[];
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
} & React.ComponentProps<typeof Col>) {
	className = className ? className + " " : "";
	return (
		<Col
			className={className + "d-flex align-items-center gap-2"}
			{...props}
		>
			<TableViewSelector selectors={selectors} actions={actions} />
			<TableColumnSelector
				columns={columns}
				selectors={selectors}
				actions={actions}
			/>
			<SplitPanelButton selectors={selectors} actions={actions} />
		</Col>
	);
}

export default SplitTableButtonGroup;
