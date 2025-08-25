import * as React from "react";
import { Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import type {
	AppTableDataSelectors,
	AppTableDataActions,
} from "../store/appTableData";

import ColumnResizer from "./ColumnResizer";

interface SplitPanelButtonProps {
	title?: string;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
}

export function SplitPanelButton({
	title,
	selectors,
	actions,
}: SplitPanelButtonProps) {
	const dispatch = useDispatch();
	const { isSplit } = useSelector(selectors.selectCurrentPanelConfig);
	const toggleIsSplit = () =>
		dispatch(actions.setPanelIsSplit({ isSplit: !isSplit }));

	return (
		<Button
			className="bi-book"
			variant="outline-secondary"
			title={title || "Show detail"}
			active={isSplit}
			onClick={toggleIsSplit}
		/>
	);
}

interface PanelProps extends React.HTMLProps<HTMLDivElement> {
	children?: React.ReactNode;
}

export const Panel = ({ children, ...otherProps }: PanelProps) => (
	<div {...otherProps}>{children}</div>
);

interface SplitPanelProps {
	style?: React.CSSProperties;
	className?: string;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
	children: [React.ReactElement<PanelProps>, React.ReactElement<PanelProps>];
}

export function SplitPanel({
	style,
	selectors,
	actions,
	children,
	...otherProps
}: SplitPanelProps) {
	const dispatch = useDispatch();
	const ref = React.useRef<HTMLDivElement>(null);
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
		};
		const rightStyle = {
			...children[1].props.style,
			flex: `${(1 - width) * 100}%`,
		};
		const onDrag = (event, { x, deltaX }) => {
			const b = (ref.current as HTMLDivElement).getBoundingClientRect(); // only called after ref established
			setPanelWidth((x - b.x) / (b.width - 5));
		};
		content = (
			<>
				{React.cloneElement(children[0], { style: leftStyle })}
				<ColumnResizer onDrag={onDrag} />
				{React.cloneElement(children[1], { style: rightStyle })}
			</>
		);
	} else {
		const leftStyle = { ...children[0].props.style, flex: "100%" };
		content = React.cloneElement(children[0], { style: leftStyle });
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
