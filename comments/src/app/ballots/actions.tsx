import { Button, Row, Col } from "react-bootstrap";

import { TableColumnSelector, SplitPanelButton } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	selectBallotsState,
	ballotsSelectors,
	ballotsActions,
} from "@/store/ballots";

import { BallotsSubmenu } from "./submenu";
import { tableColumns, quickSelect } from "./tableColumns";
import { refresh } from "./loader";

export function BallotsActions() {
	const { loading } = useAppSelector(selectBallotsState);

	return (
		<Row className="w-100 d-flex justify-content-between align-items-center m-2">
			<BallotsSubmenu />
			<Col xs="auto" className="d-flex align-items-center gap-2"
			>
				<TableColumnSelector
					columns={tableColumns}
					selectors={ballotsSelectors}
					actions={ballotsActions}
					quickSelect={quickSelect}
				/>
				<SplitPanelButton selectors={ballotsSelectors} actions={ballotsActions} />
			</Col>
			<Col xs="auto" className="d-flex justify-content-end gap-2">
				<Button
					variant="outline-secondary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={refresh}
					disabled={loading}
				/>
			</Col>
		</Row>
	);
}
