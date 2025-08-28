import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dropdown, FormCheck, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import "../icons/icons.css";

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
	const [show, setShow] = React.useState(false);

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
			<div className={styles.selector}>
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
					<Dropdown align="start" show={show} onToggle={setShow}>
						<Dropdown.Toggle
							variant="light"
							className="m-1 p-1 lh-1"
						/>
						{ReactDOM.createPortal(
							<Dropdown.Menu className="p-2">
								{customSelectorElement}
							</Dropdown.Menu>,
							anchorEl
						)}
					</Dropdown>
				)}
			</div>
			{showExpanded && (
				<Button
					variant="light"
					className={`icon icon-double-caret-${
						allExpanded ? "down" : "right"
					} m-0 p-0`}
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
				<Button
					variant="light"
					className={`icon icon-caret-${
						isExpanded ? "down" : "right"
					} m-0 p-0`}
					title="Expand all"
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
