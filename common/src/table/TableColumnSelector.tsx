import { Dropdown, Form, Row, Col } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import type {
	AppTableDataSelectors,
	AppTableDataActions,
} from "../store/appTableData";
import type { ColumnProperties, ChangeableColumnProperties } from "./AppTable";

import styles from "./TableColumnSelector.module.css";
import React from "react";

export type ColumnSelectorProps = {
	columns: Array<ColumnProperties>;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
};

function ColumnSelectorDropdown({
	columns,
	selectors,
	actions,
}: ColumnSelectorProps) {
	const dispatch = useDispatch();

	const view = useSelector(selectors.selectCurrentView);
	const tableConfig = useSelector(selectors.selectCurrentTableConfig);

	const toggleCurrentTableFixed = () =>
		dispatch(actions.toggleTableFixed({ tableView: view }));
	const setTableColumnShown = (colKey: string, shown: boolean) =>
		dispatch(
			actions.setTableColumnShown({ tableView: view, key: colKey, shown })
		);

	/* Build an array of 'selectable' column config that includes a column label */
	const selectableColumns: Array<
		ChangeableColumnProperties & { key: string; label: React.ReactNode }
	> = [];
	for (const [key, config] of Object.entries<ChangeableColumnProperties>(
		tableConfig.columns
	)) {
		if (!config.unselectable) {
			const column = columns.find((c) => c.key === key);
			selectableColumns.push({
				key,
				...config,
				label: column && column.label ? column.label : key,
			});
		}
	}

	return (
		<Dropdown.Menu>
			<Form className="p-3" style={{ minWidth: 200 }}>
				{view !== "default" && (
					<Form.Group as={Row} className="align-items-center mb-2">
						<Form.Label as="span" column xs="auto">
							Table view:
						</Form.Label>
						<Col className="d-flex justify-content-end">
							<span>{view}</span>
						</Col>
					</Form.Group>
				)}
				<Form.Group
					as={Row}
					controlId="fixed"
					className="align-items-center mb-2"
				>
					<Form.Label column xs="auto">
						Fixed width:
					</Form.Label>
					<Col className="d-flex justify-content-end">
						<Form.Check
							type="switch"
							onChange={toggleCurrentTableFixed}
							checked={tableConfig.fixed}
						/>
					</Col>
				</Form.Group>
				<div className={styles.list}>
					<style>{`
						.form-check > label {
							width: 100%;
						}
					`}</style>
					{selectableColumns.map((col) => (
						<Dropdown.Item
							key={col.key}
							style={{ paddingLeft: "2rem" }}
							as={Form.Check}
							active={col.shown}
							id={"col-enable-" + col.key}
							checked={col.shown}
							onChange={() =>
								setTableColumnShown(col.key, !col.shown)
							}
							onClick={(e) => e.stopPropagation()}
							label={col.label}
						/>
					))}
				</div>
			</Form>
		</Dropdown.Menu>
	);
}

const ColumnSelector = (props: ColumnSelectorProps) => (
	<Dropdown align="end" title="Configure table">
		<Dropdown.Toggle
			split
			variant="outline-secondary"
			className="bi-layout-three-columns"
		>
			{" Columns "}
		</Dropdown.Toggle>
		<ColumnSelectorDropdown {...props} />
	</Dropdown>
);

export default ColumnSelector;
