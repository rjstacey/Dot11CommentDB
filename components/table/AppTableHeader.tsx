import * as React from "react";

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
	defaultHeaderCellRenderer: (
		props: HeaderCellRendererProps
	) => React.ReactNode;
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
		<div
			className="header-cell"
			style={style}
		>
			<div
				className="header-cell-content"
			>
				{headerCellRenderer(headerCellRendererProps)}
			</div>
			<ColumnResizer onDrag={onDrag} />
		</div>
	);
}

/**
 * TableHeader component for AppTable
 *
 * HeaderAnchor provides an attachment point (outside the 'overflow: hidden') for dropdown overlays
 * HeaderContainer is the viewport for HeaderRow; same width as the data table row
 * HeaderRow is the full header and may exceed the viewport width; scolled by the data table horizontal scroll bar
 * A HeaderCell is present for each column and contains the header cell content and column resizer
 */
type TableHeaderProps = {
	outerStyle?: React.CSSProperties;
	innerStyle?: React.CSSProperties;
	fixed: boolean;
	columns: Array<ColumnProperties & ChangeableColumnProperties>;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
} & Pick<HeaderCellProps, "adjustColumnWidth" | "defaultHeaderCellRenderer">;

const TableHeader = React.forwardRef<HTMLDivElement, TableHeaderProps>(
	(
		{
			outerStyle,
			innerStyle,
			fixed,
			columns,
			selectors,
			actions,
			adjustColumnWidth,
			defaultHeaderCellRenderer,
		},
		ref
	) => {
		const anchorRef = React.useRef<HTMLDivElement>(null);
		const [cells, setCells] =
			React.useState<Array<JSX.Element> | null>(null);

		React.useEffect(() => {
			// After mount, update header cells: the anchor ref is now available
			const cells = columns.map((column) => (
				<HeaderCell
					key={column.key}
					anchorEl={anchorRef.current}
					column={column}
					fixed={fixed}
					selectors={selectors}
					actions={actions}
					adjustColumnWidth={adjustColumnWidth}
					defaultHeaderCellRenderer={defaultHeaderCellRenderer}
				/>
			));

			setCells(cells);
		}, [
			columns,
			fixed,
			selectors,
			actions,
			adjustColumnWidth,
			defaultHeaderCellRenderer,
		]);

		return (
			<div
				className="header-anchor"
				ref={anchorRef}
			>
				<div
					className="header-container"
					ref={ref}
					style={outerStyle}
				>
					<div
						className="header-row"
						style={innerStyle}
					>
						{cells}
					</div>
				</div>
			</div>
		);
	}
);

export default TableHeader;
