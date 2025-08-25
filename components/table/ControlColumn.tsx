import * as React from "react";
import { Dropdown, FormCheck } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import { ActionIcon } from "../icons";

import type {
	HeaderCellRendererProps,
	CellRendererProps,
	AppTableDataSelectors,
	AppTableDataActions,
} from "./AppTable";

import styles from "./ControlColumn.module.css";

const Container = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={styles.container} {...props} />
);
const Selector = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={styles.selector} {...props} />
);

type ControlHeaderCellProps = HeaderCellRendererProps & {
	customSelectorElement?: JSX.Element; //React.ReactNode;
	showExpanded?: boolean;
};

function ControlHeaderCell({
	anchorEl,
	customSelectorElement,
	showExpanded,
	selectors,
	actions,
}: ControlHeaderCellProps) {
	const dispatch = useDispatch();

	const selected = useSelector(selectors.selectSelected);
	const expanded = useSelector(selectors.selectExpanded);
	const shownIds = useSelector(selectors.selectSortedFilteredIds);

	const allSelected = React.useMemo(
		() =>
			shownIds.length > 0 && // not if list is empty
			shownIds.filter((id) => !selected.includes(id)).length === 0,
		[shownIds, selected]
	);

	const isIndeterminate = !allSelected && selected.length > 0;

	const allExpanded = React.useMemo(
		() =>
			expanded &&
			shownIds.length > 0 && // not if list is empty
			shownIds.filter((id) => !expanded.includes(id)).length === 0,
		[shownIds, expanded]
	);

	const toggleSelect = () =>
		dispatch(actions.setSelected(selected.length ? [] : shownIds));
	const toggleExpand = () =>
		dispatch(actions.setExpanded(expanded.length ? [] : shownIds));

	if (!anchorEl) return null;

	return (
		<Container>
			<Selector>
				<FormCheck
					id="control-column-selector"
					title={
						allSelected
							? "Clear all"
							: isIndeterminate
							? "Clear selected"
							: "Select all"
					}
					checked={allSelected}
					ref={(el: HTMLInputElement | null) => {
						el && (el.indeterminate = isIndeterminate);
					}}
					//indeterminate={isIndeterminate}
					onChange={toggleSelect}
				/>
				{customSelectorElement && (
					<Dropdown
						style={{
							display: "flex",
							width: "100%",
							justifyContent: "center",
						}}
						//dropdownAlign="left"
						align="start"
						//portal={anchorEl}
						//dropdownRenderer={() => customSelectorElement}
					>
						<Dropdown.Menu>{customSelectorElement}</Dropdown.Menu>
					</Dropdown>
				)}
			</Selector>
			{showExpanded && (
				<ActionIcon
					className={
						allExpanded ? "double-caret-down" : "double-caret-right"
					}
					title="Expand all"
					onClick={toggleExpand}
				/>
			)}
		</Container>
	);
}

const SelectExpandHeaderCell = (
	props: Omit<ControlHeaderCellProps, "showExpanded">
) => <ControlHeaderCell showExpanded {...props} />;
const SelectHeaderCell = (props: ControlHeaderCellProps) => (
	<ControlHeaderCell {...props} />
);

type ControlCellProps = CellRendererProps & {
	showExpanded?: boolean;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
};

function ControlCell({
	rowId,
	showExpanded,
	selectors,
	actions,
}: ControlCellProps) {
	const dispatch = useDispatch();

	const toggleSelect = () => dispatch(actions.toggleSelected([rowId]));
	const toggleExpand = () => dispatch(actions.toggleExpanded([rowId]));

	const selected = useSelector(selectors.selectSelected);
	const expanded = useSelector(selectors.selectExpanded);
	const isExpanded = expanded.includes(rowId);

	return (
		<Container onClick={(e) => e.stopPropagation()}>
			<FormCheck
				id={"select-row-" + rowId}
				title={"Select row " + rowId}
				checked={selected.includes(rowId)}
				onChange={toggleSelect}
			/>
			{showExpanded && (
				<ActionIcon
					className={isExpanded ? "caret-down" : "caret-right"}
					title="Expand row"
					//open={expanded.includes(rowId)}
					onClick={toggleExpand}
				/>
			)}
		</Container>
	);
}

const SelectExpandCell = (props: Omit<ControlCellProps, "showExpanded">) => (
	<ControlCell showExpanded {...props} />
);
const SelectCell = (props: ControlCellProps) => <ControlCell {...props} />;

export {
	SelectHeaderCell,
	SelectExpandHeaderCell,
	SelectCell,
	SelectExpandCell,
};
