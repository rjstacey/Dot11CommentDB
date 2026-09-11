import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import type { EntityId } from "@reduxjs/toolkit";
import {
	List,
	ListImperativeAPI,
	useListRef,
	getScrollbarSize,
} from "react-window";

import { AppTableRow, AppTableRowData } from "./AppTableRow";
import { TableHeader } from "./AppTableHeader";
import AppTableHeaderCell from "./HeaderCell";
import { useSetDefaultTablesConfig } from "./useTableConfig";

import type {
	GetEntityField,
	TablesConfig,
	TableConfig,
	ChangeableColumnProperties,
	AppTableDataActions,
	AppTableDataSelectors,
} from "../store/appTableData";
import { useAppTableDispatch, useAppTableSelector } from "../store/appTableData";

import "./AppTable.css";

export type { GetEntityField, AppTableDataSelectors, AppTableDataActions };

export type HeaderCellRendererProps<S = any, T1 extends {} = any, T2 extends T1 = any, Id extends EntityId = any> = {
	label?: React.ReactNode; // Column label
	dataKey: string; // Identifies the data element in the row object
	column: ColumnProperties<S, T1, T2, Id> & ChangeableColumnProperties;
	anchorEl: HTMLElement | null;
	selectors: AppTableDataSelectors<S, T1, T2, Id>;
	actions: AppTableDataActions<T1, Id>;
};

export type CellRendererProps<T2 extends {} = any, Id extends EntityId = any> = {
	dataKey: string;
	rowIndex: number;
	rowId: Id;
	rowData: T2;
	prevRowId: Id | undefined;
};

export type ColumnProperties<S = any, T1 extends {} = any, T2 extends T1 = any, Id extends EntityId = any> = {
	key: string;
	label?: React.ReactNode;
	width?: number;
	flexGrow?: number;
	flexShrink?: number;
	dropdownWidth?: number;
	dataRenderer?: (value: any) => any;
	headerRenderer?: (p: HeaderCellRendererProps<S, T1, T2, Id>) => React.ReactNode;
	cellRenderer?: (p: CellRendererProps<T2, Id>) => React.ReactNode;
};

export type { ChangeableColumnProperties, TablesConfig, TableConfig };

export type RowGetterProps<T extends {} = any, Id extends EntityId = any> = {
	rowIndex: number;
	rowId: Id;
	entities: Record<Id, T>;
	ids: Id[];
};

export type RowGetter<T extends {} = any, Id extends EntityId = any> = (props: RowGetterProps<T, Id>) => any;

export type AppTableProps<S, T1 extends {}, T2 extends T1, Id extends EntityId> = {
	fitWidth?: boolean;
	fixed?: boolean;
	columns: ColumnProperties<S, T1, T2, Id>[];
	rowGetter?: RowGetter<T2, Id>;
	headerHeight: number;
	estimatedRowHeight: number;
	measureRowHeight?: boolean;
	defaultTablesConfig?: TablesConfig;
	gutterSize?: number;
	selectors: AppTableDataSelectors<S, T1, T2, Id>;
	actions: AppTableDataActions<T1, Id>;
};

const scrollbarSize = getScrollbarSize();

const Table = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={"app-table" + (className ? " " + className : "")}
		{...props}
	/>
);

const TableBodyPlaceholder = ({
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div {...props}>
		<div className="table-body-placeholder">{children}</div>
	</div>
);

/*
 * Key down handler for Grid (when focused)
 */
const useKeyDown = <Id extends EntityId>(
	selected: Id[],
	ids: Id[],
	setSelected: (ids: Id[]) => void,
	listRef: React.RefObject<ListImperativeAPI | null>,
) =>
	useCallback(
		(event: React.KeyboardEvent) => {
			const selectAndScroll = (i: number) => {
				setSelected([ids[i]]);
				if (listRef.current) listRef.current.scrollToRow({ index: i });
			};

			// Ctrl-A selects all
			if ((event.ctrlKey || event.metaKey) && event.key === "a") {
				setSelected(ids);
				event.preventDefault();
			} else if (event.key === "Home") {
				if (ids.length) selectAndScroll(0);
			} else if (event.key === "End") {
				if (ids.length) selectAndScroll(ids.length - 1);
			} else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
				if (selected.length === 0) {
					if (ids.length > 0) selectAndScroll(0);
					return;
				}

				let id = selected[0];
				let i = ids.indexOf(id);
				if (i === -1) {
					if (ids.length > 0) selectAndScroll(0);
					return;
				}

				if (event.key === "ArrowUp") {
					if (i === 0) i = ids.length - 1;
					else i = i - 1;
				} else {
					// Down arrow
					if (i === ids.length - 1) i = 0;
					else i = i + 1;
				}

				selectAndScroll(i);
			}
		},
		[selected, ids, setSelected, listRef],
	);

const useRowClick = <Id extends EntityId>(
	selected: Id[],
	ids: Id[],
	setSelected: (ids: Id[]) => void,
) =>
	useCallback(
		({
			event,
			rowIndex,
		}: {
			event: React.MouseEvent;
			rowIndex: number;
		}) => {
			let newSelected = selected.slice();
			const id = ids[rowIndex];
			if (event.shiftKey) {
				// Shift + click => include all between last and current
				if (newSelected.length === 0) {
					newSelected.push(id);
				} else {
					const id_last = newSelected[newSelected.length - 1];
					const i_last = ids.indexOf(id_last);
					const i_selected = ids.indexOf(id);
					if (i_last >= 0 && i_selected >= 0) {
						if (i_last > i_selected) {
							for (let i = i_selected; i < i_last; i++) {
								newSelected.push(ids[i]);
							}
						} else {
							for (let i = i_last + 1; i <= i_selected; i++) {
								newSelected.push(ids[i]);
							}
						}
					}
				}
			} else if (event.ctrlKey || event.metaKey) {
				// Control + click => add or remove
				if (newSelected.includes(id))
					newSelected = newSelected.filter((s) => s !== id);
				else newSelected.push(id);
			} else {
				newSelected = [id];
			}
			setSelected(newSelected);
		},
		[selected, ids, setSelected],
	);


export function AppTable<S, T1 extends {}, T2 extends T1, Id extends EntityId>({
	gutterSize = 5,
	estimatedRowHeight,
	measureRowHeight = false,
	selectors,
	actions,
	...props
}: AppTableProps<S, T1, T2, Id>) {
	const headerRef = useRef<HTMLDivElement>(null);
	const bodyRef = useListRef(null);

	const [rowHeights, setRowHeights] = useState<number[]>([]);

	const onRowHeightChange = useCallback(
		(index: number, height: number) => {
			setRowHeights((heights) => {
				if (heights[index] === height) return heights;
				const newHeights = heights.slice();
				newHeights[index] = height;
				return newHeights;
			});
		},
		[setRowHeights],
	);

	const getRowHeight = useCallback(
		(index: number) =>
			(rowHeights[index] || estimatedRowHeight) + gutterSize,
		[estimatedRowHeight, gutterSize, rowHeights],
	);

	const dispatch = useAppTableDispatch();

	const tableConfig = useSetDefaultTablesConfig(
		props.defaultTablesConfig,
		props.columns,
		selectors,
		actions,
	);

	const { getField } = selectors;
	const { selected, expanded, loading } = useAppTableSelector(selectors.selectState);
	const ids = useAppTableSelector(selectors.selectSortedFilteredIds);
	const entities = useAppTableSelector(selectors.selectEntities);

	const adjustColumnWidth = useCallback(
		(key: string, delta: number) => dispatch(actions.adjustTableColumnWidth({ key, delta })),
		[dispatch, actions],
	);

	// Sync the table header scroll position with that of the table body
	const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
		if (headerRef.current)
			headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
	}, []);

	const setSelected = useMemo(() =>
		(ids: Id[]) => dispatch(actions.setSelected(ids)),
		[dispatch, actions.setSelected],
	);
	const onKeyDown = useKeyDown(selected, ids, setSelected, bodyRef);
	const onRowClick = useRowClick(selected, ids, setSelected);

	const fixed = tableConfig.fixed;
	const { columns, totalWidth } = useMemo(() => {
		const columns: Array<ColumnProperties<S, T1, T2, Id> & ChangeableColumnProperties> =
			props.columns
				.map((col) => ({ ...col, ...tableConfig.columns[col.key] }))
				.filter((col) => col.shown);
		const totalWidth = columns.reduce(
			(totalWidth, col) => (totalWidth = totalWidth + col.width),
			0,
		);
		return { columns, totalWidth };
	}, [props.columns, tableConfig.columns]);

	// Package the context data
	const tableData: AppTableRowData<S, T1, T2, Id> = useMemo(
		() => ({
			gutterSize,
			entities,
			ids,
			selected,
			expanded,
			fixed,
			columns,
			getRowData: props.rowGetter,
			getField,
			estimatedRowHeight,
			measureRowHeight,
			onRowHeightChange,
			onRowClick,
		}),
		[
			props.rowGetter,
			gutterSize,
			entities,
			ids,
			selected,
			expanded,
			fixed,
			columns,
			getField,
			estimatedRowHeight,
			measureRowHeight,
			onRowHeightChange,
			onRowClick,
		],
	);

	// Put header after body and reverse the display order via css to prevent header's shadow being covered by body
	return (
		<Table role="table" onKeyDown={onKeyDown} tabIndex={0}>
			{ids.length ? (
				<List<AppTableRowData<S, T1, T2, Id>>
					listRef={bodyRef}
					className="table-body"
					rowComponent={AppTableRow}
					rowProps={tableData}
					rowCount={ids.length}
					rowHeight={getRowHeight}
					onScroll={onScroll}
				/>
			) : (
				<TableBodyPlaceholder className="table-body">
					{loading ? "Loading..." : "Empty"}
				</TableBodyPlaceholder>
			)}
			<TableHeader
				headerRef={headerRef}
				scrollbarSize={scrollbarSize}
				fixed={fixed}
				columns={columns}
				selectors={selectors}
				actions={actions}
				adjustColumnWidth={adjustColumnWidth}
				defaultHeaderCellRenderer={(p) => <AppTableHeaderCell {...p} />}
			/>
		</Table>
	);
}
