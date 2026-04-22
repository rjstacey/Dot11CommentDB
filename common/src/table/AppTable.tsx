import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { Action, EntityId } from "@reduxjs/toolkit";
import {
	List,
	ListImperativeAPI,
	useListRef,
	getScrollbarSize,
} from "react-window";

import { AppTableRow, AppTableRowData } from "./AppTableRow";
import { TableHeader } from "./AppTableHeader";
import AppTableHeaderCell from "./HeaderCell";

import type {
	GetEntityField,
	TablesConfig,
	TableConfig,
	ChangeableColumnProperties,
	AppTableDataActions,
	AppTableDataSelectors,
} from "../store/appTableData";

import "./AppTable.css";

export type { GetEntityField, AppTableDataSelectors, AppTableDataActions };

export type HeaderCellRendererProps = {
	label?: React.ReactNode; // Column label
	dataKey: string; // Identifies the data element in the row object
	column: ColumnProperties & ChangeableColumnProperties;
	anchorEl: HTMLElement | null;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
};

export type CellRendererProps<T = any> = {
	dataKey: string;
	rowIndex: number;
	rowId: EntityId;
	rowData: T;
	prevRowId: EntityId | undefined;
};

export type ColumnProperties = {
	key: string;
	label?: React.ReactNode;
	width?: number;
	flexGrow?: number;
	flexShrink?: number;
	dropdownWidth?: number;
	dataRenderer?: (value: any) => any;
	headerRenderer?: (p: HeaderCellRendererProps) => React.ReactNode;
	cellRenderer?: (p: CellRendererProps) => React.ReactNode;
};

export type { ChangeableColumnProperties, TablesConfig, TableConfig };

export type RowGetterProps<T = any> = {
	rowIndex: number;
	rowId: EntityId;
	entities: Record<EntityId, T>;
	ids: EntityId[];
};

export type RowGetter<T = any> = (props: RowGetterProps<T>) => any;

export type AppTableProps = {
	fitWidth?: boolean;
	fixed?: boolean;
	columns: ColumnProperties[];
	rowGetter?: RowGetter;
	headerHeight: number;
	estimatedRowHeight: number;
	measureRowHeight?: boolean;
	defaultTablesConfig?: TablesConfig;
	gutterSize?: number;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
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
const useKeyDown = (
	selected: EntityId[],
	ids: EntityId[],
	setSelected: (ids: EntityId[]) => void,
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

const useRowClick = (
	selected: EntityId[],
	ids: EntityId[],
	setSelected: (ids: EntityId[]) => void,
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

const useSetDefaultTablesConfig = (
	defaultTablesConfigIn: TablesConfig | undefined,
	defaultFixed: boolean | undefined,
	columns: ColumnProperties[],
	dispatch: ReturnType<typeof useDispatch>,
	setDefaultTablesConfig: (payload: {
		tableView: string;
		tablesConfig: TablesConfig;
	}) => Action,
) => {
	const defaultTablesConfig = useMemo(() => {
		let defaultTablesConfig: TablesConfig;
		if (!defaultTablesConfigIn) {
			const config: TableConfig = {
				fixed: defaultFixed || false,
				columns: {},
			};
			for (const col of columns)
				config.columns[col.key] = {
					unselectable: true,
					shown: true,
					width: col.width || 100,
				};
			defaultTablesConfig = { default: config };
		} else {
			defaultTablesConfig = { ...defaultTablesConfigIn };
			for (const [view, config] of Object.entries(defaultTablesConfig)) {
				if (typeof config.fixed !== "boolean") {
					config.fixed = !!defaultFixed || false;
				}
				if (typeof config.columns !== "object") {
					console.warn(
						`defaultTablesConfig['${view}'] does not include columns object`,
					);
					config.columns = {};
				}
				for (const col of columns) {
					if (!config.columns.hasOwnProperty(col.key)) {
						console.warn(
							`defaultTablesConfig['${view}'] does not include column with key '${col.key}'`,
						);
						config.columns[col.key] = {
							unselectable: true,
							shown: true,
							width: col.width || 100,
						};
					}
				}
			}
		}
		return defaultTablesConfig;
	}, [defaultTablesConfigIn, defaultFixed, columns]);

	const defaultTableView = Object.keys(defaultTablesConfig)[0];

	useEffect(() => {
		dispatch(
			setDefaultTablesConfig({
				tableView: defaultTableView,
				tablesConfig: defaultTablesConfig,
			}),
		);
	}, [
		defaultTableView,
		defaultTablesConfig,
		dispatch,
		setDefaultTablesConfig,
	]);

	return defaultTablesConfig[defaultTableView];
};

export function AppTable({
	gutterSize = 5,
	estimatedRowHeight,
	measureRowHeight = false,
	selectors,
	actions,
	...props
}: AppTableProps) {
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

	const dispatch = useDispatch();

	const defaultTableConfig = useSetDefaultTablesConfig(
		props.defaultTablesConfig,
		props.fixed,
		props.columns,
		dispatch,
		actions.setDefaultTablesConfig,
	);

	const { getField } = selectors;
	const { selected, expanded, loading } = useSelector(selectors.selectState);
	const ids = useSelector(selectors.selectSortedFilteredIds);
	const entities = useSelector(selectors.selectEntities);
	const tableConfig =
		useSelector(selectors.selectCurrentTableConfig) || defaultTableConfig;

	const adjustColumnWidth = useCallback(
		(key: string, delta: number) => {
			dispatch(actions.adjustTableColumnWidth({ key, delta }));
		},
		[dispatch, actions],
	);

	// Sync the table header scroll position with that of the table body
	const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
		if (headerRef.current)
			headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
	}, []);

	const setSelected = useCallback(
		(ids: EntityId[]) => dispatch(actions.setSelected(ids)),
		[dispatch, actions],
	);
	const onKeyDown = useKeyDown(selected, ids, setSelected, bodyRef);
	const onRowClick = useRowClick(selected, ids, setSelected);

	const fixed = tableConfig.fixed;
	const { columns, totalWidth } = useMemo(() => {
		const columns: Array<ColumnProperties & ChangeableColumnProperties> =
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
	const tableData: AppTableRowData = useMemo(
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
				<List<AppTableRowData>
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
