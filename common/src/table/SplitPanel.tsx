import {
	cloneElement,
	useRef,
	type CSSProperties,
	type ReactElement,
	type ReactNode,
	type HTMLProps,
} from "react";
import { Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import type {
	AppTableDataSelectors,
	AppTableDataActions,
} from "../store/appTableData";

import ColumnResizer, { DraggableEventHandler } from "./ColumnResizer";

export function SplitPanelButton({
	title,
	selectors,
	actions,
}: {
	title?: string;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
}) {
	const dispatch = useDispatch();
	const { isSplit } = useSelector(selectors.selectCurrentPanelConfig);
	const toggleIsSplit = () =>
		dispatch(actions.setPanelIsSplit({ isSplit: !isSplit }));

	return (
		<Button
			variant="outline-secondary"
			title={title || "Show detail"}
			active={isSplit}
			onClick={toggleIsSplit}
		>
			<i className="bi-book me-1" />
			<span className="me-1">{"Detail"}</span>
		</Button>
	);
}

interface PanelProps extends HTMLProps<HTMLDivElement> {
	children?: ReactNode;
}

export const Panel = ({ children, ...otherProps }: PanelProps) => (
	<div {...otherProps}>{children}</div>
);

export function SplitPanel({
	style,
	selectors,
	actions,
	children,
	...otherProps
}: {
	style?: CSSProperties;
	className?: string;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
	children: [ReactElement<PanelProps>, ReactElement<PanelProps>];
}) {
	const dispatch = useDispatch();
	const ref = useRef<HTMLDivElement>(null);
	let { isSplit, width } = useSelector(selectors.selectCurrentPanelConfig);
	const setPanelWidth = (width: number) =>
		dispatch(actions.setPanelWidth({ width }));

	let content;
	if (isSplit) {
		if (typeof width !== "number" || isNaN(width) || width < 0 || width > 1)
			width = 0.5;
		const leftStyle = {
			...children[0].props.style,
			flex: `${width * 100}%`,
			overflow: "hidden",
		};
		const rightStyle = {
			...children[1].props.style,
			flex: `${(1 - width) * 100}%`,
			overflow: "hidden",
		};
		const onDrag: DraggableEventHandler = (event, { x, deltaX }) => {
			const b = (ref.current as HTMLDivElement).getBoundingClientRect(); // only called after ref established
			setPanelWidth((x - b.x) / (b.width - 5));
		};
		content = (
			<>
				{cloneElement(children[0], { style: leftStyle })}
				<ColumnResizer onDrag={onDrag} />
				{cloneElement(children[1], { style: rightStyle })}
			</>
		);
	} else {
		const leftStyle = {
			...children[0].props.style,
			flex: "100%",
			overflow: "hidden",
		};
		content = cloneElement(children[0], { style: leftStyle });
	}

	return (
		<div
			ref={ref}
			style={{
				display: "flex",
				flex: 1,
				width: "100%",
				overflow: "hidden",
				...style,
			}}
			{...otherProps}
		>
			{content}
		</div>
	);
}

export default SplitPanel;
