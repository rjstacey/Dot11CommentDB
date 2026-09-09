import { Dropdown, Form, Row, Col, ButtonGroup, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import isEqual from "lodash.isequal";

import type {
	AppTableDataSelectors,
	AppTableDataActions,
} from "../store/appTableData";
import type { ColumnProperties, ChangeableColumnProperties } from "./AppTable";

import "./TableColumnSelector.css";

export type ColumnSelectorProps = {
	columns: ColumnProperties[];
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
	quickSelect?: Record<string, string[]>;
};

function QuickSelect({ quickSelect, shownColumns, setShownColumns }: { quickSelect: Record<string, string[]>; shownColumns: string[]; setShownColumns: (keys: string[]) => void }) {
	const entries = Object.entries(quickSelect);
	return (
		<Form.Group
			as={Row}
			controlId="quick-select"
			className="align-items-center mb-2"
		>
			<Form.Label as="span" column xs="auto">
				Quick select:
			</Form.Label>
			<ButtonGroup>
				{entries.map(([label, value]) => (
					<Button
						key={label}
						variant="outline-secondary"
						active={isEqual(shownColumns, value)}
						onClick={() => setShownColumns(value)}
					>
						{label}
					</Button>
				))}
			</ButtonGroup>
		</Form.Group>
	)
}

export function ColumnSelectorDropdown({
	columns,
	selectors,
	actions,
	quickSelect,
}: ColumnSelectorProps) {
	const dispatch = useDispatch();

	const view = useSelector(selectors.selectCurrentView);
	const tableConfig = useSelector(selectors.selectCurrentTableConfig);

	const toggleCurrentTableFixed = () =>
		dispatch(actions.toggleTableFixed({ tableView: view }));
	const setTableColumnShown = (colKey: string, shown: boolean) =>
		dispatch(
			actions.setTableColumnShown({
				tableView: view,
				key: colKey,
				shown,
			}),
		);

	/* Build an array of 'selectable' column config that includes a column label */
	const selectableColumns: Array<
		ChangeableColumnProperties & { key: string; label: React.ReactNode }
	> = [];
	for (const [key, config] of Object.entries<ChangeableColumnProperties>(
		tableConfig.columns,
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

	const shownColumns = Object.keys(tableConfig.columns).filter(key => tableConfig.columns[key].shown);
	function setColumnsShown(keys: string[]) {
		const shown: Record<string, boolean> = {};
		for (const key of Object.keys(tableConfig.columns)) {
			shown[key] = keys.includes(key);
		}
		dispatch(actions.setTableColumnsShown({ tableView: view, shown }));
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
				{quickSelect && (
					<QuickSelect quickSelect={quickSelect} shownColumns={shownColumns} setShownColumns={setColumnsShown} />
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
				<div className="column-list">
					{selectableColumns.map((col) => (
						<Dropdown.Item
							as={Form.Check}
							key={col.key}
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

const ColumnSelector = (props: React.ComponentProps<typeof ColumnSelectorDropdown>) => (
	<Dropdown align="end" title="Configure table">
		<Dropdown.Toggle split variant="outline-secondary">
			<i className="bi-layout-three-columns me-1" />
			<span className="me-1">{"Columns"}</span>
		</Dropdown.Toggle>
		<ColumnSelectorDropdown {...props} />
	</Dropdown>
);

export default ColumnSelector;
