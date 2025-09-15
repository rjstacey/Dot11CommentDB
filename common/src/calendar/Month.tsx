import React from "react";

import type { ViewDate } from "./Calendar";
import { getMonthGrid, weekdayLabels } from "./utils";

function DayLabel({ cell }) {
	const classNames = ["day"];
	if (cell.isWeekend) classNames.push("weekend");

	return (
		<div className={classNames.join(" ")}>
			<div className="inner">
				<span>
					{weekdayLabels[cell.date.getDay()]}
				</span>
			</div>
		</div>
	);
}

function Day({ cell, onClick }) {
	const classNames = ["day", "date"];
	if (cell.isInactive) classNames.push("inactive");
	if (cell.isDisabled) classNames.push("disabled");
	if (cell.isWeekend) classNames.push("weekend");
	if (cell.isToday) classNames.push("today");
	if (cell.isSelected) classNames.push("selected");

	return (
		<div
			className={classNames.join(" ")}
			tabIndex={cell.isDisabled ? -1 : 0}
			onClick={cell.isDisabled ? undefined : () => onClick(cell)}
		>
			<div className="inner">
				<span>
					{cell.date.getDate()}
				</span>
			</div>
		</div>
	);
}

/* onKeyPress is called with an array of nodes representing the active dates in the month.
 * Navigate these nodes using arrow keys, etc. */
function onKeyPress(nodes: Array<HTMLDivElement>, e: KeyboardEvent) {
	if (nodes.length === 0) return;

	if (e.key === "Escape") {
		//e.preventDefault();
		// hack so browser focuses the next tabbable element when
		// tab is pressed
		nodes[nodes.length - 1].focus();
		nodes[nodes.length - 1].blur();
	}

	let i = nodes.findIndex((cell) => cell === e.target);
	if (i < 0) {
		if (
			e.key === "ArrowDown" ||
			e.key === "ArrowUp" ||
			e.key === "ArrowRight" ||
			e.key === "ArrowLeft" ||
			e.key === "Home" ||
			e.key === "End"
		) {
			nodes[0].focus();
		}
		return;
	}

	if (e.key === " " || e.key === "Enter") {
		nodes[i].click();
		return;
	}

	if (e.key === "ArrowDown") {
		i += 7;
		if (i >= nodes.length) i = nodes.length - 1;
	} else if (e.key === "ArrowUp") {
		i -= 7;
		if (i < 0) i = 0;
	} else if (e.key === "ArrowRight") {
		i++;
		if (i >= nodes.length) i = nodes.length - 1;
	} else if (e.key === "ArrowLeft") {
		i--;
		if (i < 0) i = 0;
	} else if (e.key === "Home") {
		i = 0;
	} else if (e.key === "End") {
		i = nodes.length - 1;
	} else {
		return;
	}
	nodes[i].focus();
}

type NodeRef = {
	node: HTMLDivElement;
	listener: (e: any) => void;
};

function Month({
	dates,
	onDateClick,
	viewDate,
	options,
}: {
	dates: Array<string>;
	onDateClick: (isoDate: string) => void;
	viewDate: ViewDate;
	options: object;
}) {
	/* Use a callback ref instead of useEffect. The callback ref, by definition, is called
	 * when the referenced node changes. useEffect doesn't necessarily trigger with ref changes. */
	const ref = React.useRef<NodeRef | null>(null);
	const setRef = React.useCallback((node: HTMLDivElement) => {
		if (ref.current) {
			// Already set; do some cleanup
			const { node, listener } = ref.current;
			node.removeEventListener("keydown", listener);
		}

		if (node) {
			const nodes = Array.from<HTMLDivElement>(
				node.querySelectorAll(".calendar_date:not(.calendar_disabled)")
			);
			const listener = (e: KeyboardEvent) => onKeyPress(nodes, e);
			node.addEventListener("keydown", listener);
			ref.current = { node, listener };
		} else {
			ref.current = null;
		}
	}, []);

	const matrix = React.useMemo(
		() => getMonthGrid({ dates, viewDate, options }),
		[dates, viewDate, options]
	);

	return (
		<div className="month">
			<div className="week-row">
				{matrix[0].map((cell, index) => (
					<DayLabel key={index} cell={cell} />
				))}
			</div>
			<div
				ref={setRef}
				className="dates-block"
				role="grid"
			>
				{matrix.map((row, index) => (
					<div
						className="week-row"
						key={index}
					>
						{row.map((cell) => (
							<Day
								key={cell.isoDate}
								cell={cell}
								onClick={() => onDateClick(cell.isoDate)}
							/>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

export default Month;
