import {
	CSSProperties,
	useEffect,
	useMemo,
	useRef,
	type MouseEvent,
} from "react";
import type { EntityId } from "@reduxjs/toolkit";

import type { GetEntityField, ColumnProperties, RowGetter } from "./AppTable";

/**
 * TableRow component for AppTable
 */
function TableRow({
	style,
	gutterSize,
	rowIndex,
	rowId,
	rowData,
	prevRowId,
	isSelected,
	isExpanded,
	fixed,
	columns,
	getField,
	estimatedRowHeight,
	onRowHeightChange,
	onClick,
}: {
	style: {
		top?: number | string;
		width?: number | string;
		height?: number | string;
	};
	gutterSize: number;
	rowIndex: number;
	rowId: EntityId;
	rowData: { [k: string]: unknown };
	prevRowId: EntityId | undefined;
	isSelected: boolean;
	isExpanded: boolean;
	fixed: boolean;
	columns: ColumnProperties[];
	getField: GetEntityField;
	estimatedRowHeight: number;
	onRowHeightChange: (rowIndex: number, height: number) => void;
	onClick?: (event: MouseEvent) => void;
}) {
	const rowRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const height = isExpanded
			? rowRef.current!.getBoundingClientRect().height
			: estimatedRowHeight;
		if (style.height !== height) onRowHeightChange(rowIndex, height);
	}, [
		rowIndex,
		isExpanded,
		estimatedRowHeight,
		columns,
		fixed,
		onRowHeightChange,
		style.height,
		style.width,
	]);

	const cells = columns.map((column) => {
		const {
			cellRenderer,
			dataRenderer,
			width,
			flexGrow,
			flexShrink,
			key: dataKey,
		} = column;
		const style = {
			flexBasis: width,
			flexGrow: fixed ? 0 : flexGrow,
			flexShrink: fixed ? 0 : flexShrink,
			overflow: "hidden", // necessary to ensure that the content does not affect width
		};
		let content: React.ReactNode;
		if (cellRenderer) {
			content = cellRenderer({
				rowIndex,
				rowId,
				prevRowId,
				rowData,
				dataKey,
			});
		} else {
			content = getField(rowData, dataKey);
			if (dataRenderer) content = dataRenderer(content);
		}
		return (
			<div key={dataKey} className="data-cell" style={style}>
				{content}
			</div>
		);
	});

	// Add appropriate row classNames
	let classNames = ["data-row"];
	classNames.push(rowIndex % 2 === 0 ? "data-row-even" : "data-row-odd");
	if (isSelected) classNames.push("data-row-selected");

	if (typeof style.top === "number" && typeof style.height === "number")
		style = {
			...style,
			top: style.top + gutterSize,
			height: style.height - gutterSize,
		}; // Adjust style for gutter

	if (fixed && "width" in style) delete style.width; // Remove width for fixed rows to allow them to stretch

	return (
		<div style={style} className={classNames.join(" ")} onClick={onClick}>
			<div ref={rowRef} className="data-row-inner">
				{cells}
			</div>
		</div>
	);
}

export type AppTableRowData = {
	gutterSize: number;
	entities: Record<EntityId, unknown>;
	ids: EntityId[];
	selected: EntityId[];
	expanded: EntityId[];
	fixed: boolean;
	columns: ColumnProperties[];
	getRowData?: RowGetter;
	getField: GetEntityField;
	estimatedRowHeight: number;
	measureRowHeight: boolean;
	onRowHeightChange: (index: number, height: number) => void;
	onRowClick: ({
		event,
		rowIndex,
	}: {
		event: MouseEvent;
		rowIndex: number;
	}) => void;
};

export function AppTableRow({
	index: rowIndex,
	style,
	entities,
	ids,
	selected,
	expanded,
	measureRowHeight,
	getRowData,
	onRowClick,
	...otherProps
}: {
	index: number;
	style: CSSProperties;
} & AppTableRowData) {
	const { rowId, rowData, prevRowId } = useMemo(() => {
		const rowId = ids[rowIndex];
		const prevRowId = rowIndex > 0 ? ids[rowIndex - 1] : undefined;
		const rowData = getRowData
			? getRowData({ rowIndex, rowId, ids, entities })
			: entities[rowId];
		return { rowId, rowData, prevRowId };
	}, [getRowData, rowIndex, ids, entities]);

	const isSelected = selected && selected.includes(rowId);
	const isExpanded =
		measureRowHeight || (expanded && expanded.includes(rowId));

	const onClick = useMemo(
		() =>
			onRowClick
				? (event: MouseEvent) => onRowClick({ event, rowIndex })
				: undefined,
		[onRowClick, rowIndex],
	);

	return (
		<TableRow
			key={rowId}
			style={style}
			rowIndex={rowIndex}
			rowId={rowId}
			prevRowId={prevRowId}
			rowData={rowData}
			isSelected={isSelected}
			isExpanded={isExpanded}
			onClick={onClick}
			{...otherProps}
		/>
	);
}
