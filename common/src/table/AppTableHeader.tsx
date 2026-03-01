import {
	forwardRef,
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode,
} from "react";

import { ColumnResizer, DraggableEventHandler } from "./ColumnResizer";

import type {
	ColumnProperties,
	ChangeableColumnProperties,
	HeaderCellRendererProps,
	AppTableDataSelectors,
	AppTableDataActions,
} from "./AppTable";

type HeaderCellProps = {
	anchorEl: HTMLElement | null;
	column: ColumnProperties & ChangeableColumnProperties;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
	fixed: boolean;
	adjustColumnWidth: (key: string, deltaX: number) => void;
	defaultHeaderCellRenderer: (props: HeaderCellRendererProps) => ReactNode;
};

function HeaderCell({
	anchorEl,
	column,
	fixed,
	selectors,
	actions,
	adjustColumnWidth,
	defaultHeaderCellRenderer,
}: HeaderCellProps) {
	const {
		key: dataKey,
		width,
		flexGrow,
		flexShrink,
		headerRenderer,
		...colProps
	} = column;
	const style = {
		display: "flex",
		flexBasis: width,
		flexGrow: fixed ? 0 : flexGrow,
		flexShrink: fixed ? 0 : flexShrink,
		overflow: "hidden", // necessary so that the content does not affect size
	};
	const headerCellRenderer = headerRenderer || defaultHeaderCellRenderer;
	const headerCellRendererProps: HeaderCellRendererProps = {
		anchorEl,
		dataKey,
		column,
		selectors,
		actions,
		...colProps,
	};
	const onDrag: DraggableEventHandler = (event, { deltaX }) =>
		adjustColumnWidth(dataKey, deltaX);
	return (
		<div className="header-cell" style={style}>
			<div className="header-cell-content">
				{headerCellRenderer(headerCellRendererProps)}
			</div>
			<ColumnResizer onDrag={onDrag} />
		</div>
	);
}

/**
 * TableHeader component for AppTable
 *
 * div.table-header provides an attachment point (outside the 'overflow: hidden') for dropdown overlays
 * div.header-container is the viewport for HeaderRow; same width as the data table row
 * div.header-row is the full header and may exceed the viewport width; scrolled by the data table horizontal scroll bar
 * A HeaderCell is present for each column and contains the header cell content and column resizer
 */
export function TableHeader({
	headerRef,
	scrollbarSize,
	fixed,
	columns,
	selectors,
	actions,
	adjustColumnWidth,
	defaultHeaderCellRenderer,
}: {
	headerRef: React.Ref<HTMLDivElement>;
	scrollbarSize: number;
	fixed: boolean;
	columns: Array<ColumnProperties & ChangeableColumnProperties>;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
} & Pick<HeaderCellProps, "adjustColumnWidth" | "defaultHeaderCellRenderer">) {
	const anchorRef = useRef<HTMLDivElement>(null);

	return (
		<div className="table-header" ref={anchorRef}>
			<div
				className="header-container"
				ref={headerRef}
				style={{ paddingRight: scrollbarSize }}
			>
				<div className="header-row">
					{columns.map((column) => (
						<HeaderCell
							key={column.key}
							anchorEl={anchorRef.current}
							column={column}
							fixed={fixed}
							selectors={selectors}
							actions={actions}
							adjustColumnWidth={adjustColumnWidth}
							defaultHeaderCellRenderer={
								defaultHeaderCellRenderer
							}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
