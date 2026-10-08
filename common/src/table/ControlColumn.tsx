import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Dropdown, FormCheck, Button } from "react-bootstrap";
import type { EntityId } from "@reduxjs/toolkit";
import { useAppTableDispatch, useAppTableSelector } from "../store/appTableData";

import type {
	HeaderCellRendererProps,
	CellRendererProps,
	AppTableDataSelectors,
	AppTableDataActions,
} from "./AppTable";

import "../styles/index.css";
import "./ControlColumn.css";

type ControlHeaderCellProps<S, T1 extends {}, T2 extends T1, Id extends EntityId> = HeaderCellRendererProps<S, T1, T2, Id> & {
	customSelectorElement?: React.ReactElement; //React.ReactNode;
	showExpanded?: boolean;
};

function ControlHeaderCell<S, T1 extends {}, T2 extends T1, Id extends EntityId>({
	anchorEl,
	customSelectorElement,
	showExpanded,
	selectors,
	actions,
}: ControlHeaderCellProps<S, T1, T2, Id>) {
	const dispatch = useAppTableDispatch();

	const selected = useAppTableSelector(selectors.selectSelected);
	const expanded = useAppTableSelector(selectors.selectExpanded);
	const shownIds = useAppTableSelector(selectors.selectSortedFilteredIds);
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
					className={`icon icon-double-caret-${allExpanded ? "down" : "right"
						} m-0 p-0`}
					title="Expand all"
					onClick={toggleExpand}
				/>
			)}
		</div>
	);
}

const SelectExpandHeaderCell = <S, T1 extends {}, T2 extends T1, Id extends EntityId>(
	props: Omit<ControlHeaderCellProps<S, T1, T2, Id>, "showExpanded">,
) => <ControlHeaderCell showExpanded {...props} />;
const SelectHeaderCell = <S, T1 extends {}, T2 extends T1, Id extends EntityId>(props: ControlHeaderCellProps<S, T1, T2, Id>) => (
	<ControlHeaderCell {...props} />
);

type ControlCellProps<S, T1 extends {}, T2 extends T1, Id extends EntityId> = CellRendererProps<T2, Id> & {
	showExpanded?: boolean;
	selectors: AppTableDataSelectors<S, T1, T2, Id>;
	actions: AppTableDataActions<T1, Id>;
};

function ControlCell<S, T1 extends {}, T2 extends T1, Id extends EntityId>({
	rowId,
	showExpanded,
	selectors,
	actions,
}: ControlCellProps<S, T1, T2, Id>) {
	const dispatch = useAppTableDispatch();

	const selected = useAppTableSelector(selectors.selectSelected);
	const expanded = useAppTableSelector(selectors.selectExpanded);

	const isSelected = selected.includes(rowId);
	const toggleSelect = () => {
		const i = selected.indexOf(rowId);
		let s = selected.slice();
		if (i >= 0) s.splice(i, 1);
		else s.push(rowId);
		dispatch(actions.setSelected(s));
	};

	const isExpanded = expanded.includes(rowId);
	const toggleExpand = () => {
		const i = expanded.indexOf(rowId);
		let e = expanded.slice();
		if (i >= 0) e.splice(i, 1);
		else e.push(rowId);
		dispatch(actions.setExpanded(e));
	};

	return (
		<div className="control-column" onClick={(e) => e.stopPropagation()}>
			<FormCheck
				id={"select-row-" + rowId}
				title={"Select row " + rowId}
				checked={isSelected}
				onChange={toggleSelect}
			/>
			{showExpanded && (
				<Button
					variant="light"
					className={`icon icon-caret-${isExpanded ? "down" : "right"} m-0 p-0`}
					title="Expand all"
					onClick={toggleExpand}
				/>
			)}
		</div>
	);
}

const SelectExpandCell = <S, T1 extends {}, T2 extends T1, Id extends EntityId>(props: Omit<ControlCellProps<S, T1, T2, Id>, "showExpanded">) => (
	<ControlCell showExpanded {...props} />
);
const SelectCell = <S, T1 extends {}, T2 extends T1, Id extends EntityId>(props: ControlCellProps<S, T1, T2, Id>) => <ControlCell {...props} />;

export {
	SelectHeaderCell,
	SelectExpandHeaderCell,
	SelectCell,
	SelectExpandCell,
};
