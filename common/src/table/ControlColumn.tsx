import { useState, useMemo, JSX } from "react";
import { createPortal } from "react-dom";
import { Dropdown, FormCheck, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import type {
	HeaderCellRendererProps,
	CellRendererProps,
	AppTableDataSelectors,
	AppTableDataActions,
} from "./AppTable";

import "./icons.css";
import "./ControlColumn.css";

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
	const [show, setShow] = useState(false);

	const allSelected = useMemo(
		() =>
			shownIds.length > 0 && // not if list is empty
			shownIds.filter((id) => !selected.includes(id)).length === 0,
		[shownIds, selected],
	);

	const isIndeterminate = !allSelected && selected.length > 0;

	const allExpanded = useMemo(
		() =>
			expanded &&
			shownIds.length > 0 && // not if list is empty
			shownIds.filter((id) => !expanded.includes(id)).length === 0,
		[shownIds, expanded],
	);

	const toggleSelect = () =>
		dispatch(actions.setSelected(selected.length ? [] : shownIds));
	const toggleExpand = () =>
		dispatch(actions.setExpanded(expanded.length ? [] : shownIds));

	if (!anchorEl) return null;

	return (
		<div className="control-column">
			<div className="selector">
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
					onChange={toggleSelect}
				/>
				{customSelectorElement && (
					<Dropdown align="start" show={show} onToggle={setShow}>
						<Dropdown.Toggle
							variant="light"
							className="m-1 p-1 lh-1"
						/>
						{show &&
							createPortal(
								<Dropdown.Menu className="p-2">
									{customSelectorElement}
								</Dropdown.Menu>,
								anchorEl,
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
		</div>
	);
}

const SelectExpandHeaderCell = (
	props: Omit<ControlHeaderCellProps, "showExpanded">,
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
		<div className="control-column" onClick={(e) => e.stopPropagation()}>
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
		</div>
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
