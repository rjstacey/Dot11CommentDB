import * as React from "react";
import { DateTime } from "luxon";
import { EntityId } from "@reduxjs/toolkit";

import { Button } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import {
	Session,
	Timeslot,
	selectSessionEntities,
	getCredit
} from "../store/sessions";

import { RawSessionSelector } from "../components/SessionSelector";

const CreditGrid = ({
	nCol,
	nRow,
	...props
}: { nCol: number; nRow: number } & React.ComponentProps<"div">) => (
	<div
		style={{
			display: "grid",
			gridTemplateColumns: `max-content repeat(${nCol}, minmax(30px, 1fr))`,
			gridTemplateRows: `max-content repeat(${nRow}, minmax(30px, 1fr))`,
		}}
		{...props}
	/>
);

function GridColumnLabel({
	style,
	colIndex,
	date,
}: {
	style?: React.CSSProperties;
	colIndex: number;
	date: string;
}) {
	const { weekdayShort, day } = DateTime.fromISO(date);

	return (
		<div
			style={{
				...style,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				paddingBottom: 10,
			}}
		>
			<div style={{ textTransform: "uppercase" }}>{weekdayShort}</div>
			<div>{day}</div>
		</div>
	);
}

const GridRowLabel = ({
	style,
	rowIndex,
	label,
	...otherProps
}: {
	style?: React.CSSProperties;
	rowIndex: number;
	label: string;
}) => (
	<div
		style={{ ...style, display: "flex", alignItems: "center" }}
		{...otherProps}
	>
		{label}
	</div>
);

const GridCell: React.FC<{
	style?: React.CSSProperties;
	rowIndex: number;
	colIndex: number;
	children: React.ReactNode;
}> = ({ style, rowIndex, colIndex, ...otherProps }) => (
	<div
		style={{
			...style,
			display: "flex",
			justifyContent: "center",
			padding: 5,
		}}
		{...otherProps}
	/>
);

function sessionDates(session?: Session) {
	let dates: string[] = [];
	if (session) {
		const start = DateTime.fromISO(session.startDate);
		const end = DateTime.fromISO(session.endDate).plus({ days: 1 });
		const nDays = end.diff(start, "days").days;
		if (nDays > 0) {
			dates = new Array(nDays)
				.fill(null)
				.map((d, i) => start.plus({ days: i }).toISODate()!);
		}
	}
	return dates;
}

const creditOptions = ["Normal", "Extra", "Other 2/1", "Zero"];

const defaultCredit = "Extra";

function validDayCredits(dayCredits: string[], timeslots: Timeslot[]) {
	return (
		Array.isArray(dayCredits) &&
		dayCredits.length === timeslots.length
	);
}

function defaultDayCredits(timeslots: Timeslot[]) {
	return Array(timeslots.length).fill(defaultCredit);
}

function CreditTotals({ defaultCredits }: { defaultCredits: string[][] }) {
	let credits = 0;
	for (const dayCredit of defaultCredits) {
		for (const credit of dayCredit) {
			const c = getCredit(credit);
			if (c.credit === "Other")
				credits += c.creditOverrideDenominator;
			else if (c.credit === "Normal")
				credits++;
		}
	}

	return (
		<div style={{ display: "flex" }}>
			<span>Credits: {credits}</span>
		</div>
	);
}

const gridCellBackground: { [K: string]: string } = {
	Normal: "#cccccc",
	Extra: "#eeeeee",
	Zero: "#ffffff",
};

const CreditButton: React.FC<{
	credit: string;
	style?: React.CSSProperties;
	onClick: (e: React.MouseEvent) => void;
	disabled?: boolean;
}> = function ({ credit, style, ...otherProps }) {
	return (
		<Button
			style={{
				...style,
				width: "100%",
				background: gridCellBackground[credit],
			}}
			{...otherProps}
		>
			{credit}
		</Button>
	);
};

function SessionCredit({
	session,
	updateSession,
	readOnly,
}: {
	session: Session;
	updateSession: (changes: Partial<Session>) => void;
	readOnly?: boolean;
}) {
	const entities = useAppSelector(selectSessionEntities);
	const dates = sessionDates(session);
	const { timeslots, defaultCredits } = session;

	/* Make sure we have a valid defaultCredits array. One that matches dates and timeslots. */
	React.useEffect(() => {
		let s = defaultCredits;
		// Get the length right
		if (!Array.isArray(defaultCredits))
			s = Array(dates.length).fill(defaultDayCredits(timeslots));
		else if (defaultCredits.length < dates.length)
			s = s.concat(
				Array(dates.length - defaultCredits.length).fill(
					defaultDayCredits(timeslots)
				)
			);
		else if (defaultCredits.length > dates.length) {
			s = s.slice();
			s.splice(dates.length);
		}
		// Make sure each entry aligns with timeslots
		if (!s.every((dayCredits) => validDayCredits(dayCredits, timeslots)))
			s = s.map((dayCredits) =>
				validDayCredits(dayCredits, timeslots)
					? dayCredits
					: defaultDayCredits(timeslots)
			);
		if (s !== defaultCredits) updateSession({ defaultCredits: s });
	}, [defaultCredits, dates, timeslots, updateSession]);

	/* Don't render until we do have a valid one */
	if (
		!Array.isArray(defaultCredits) ||
		defaultCredits.length !== dates.length ||
		!defaultCredits.every((dayCredits) =>
			validDayCredits(dayCredits, timeslots)
		)
	)
		return null;

	function importDefaultCreditsFromSession(sessionId: EntityId) {
		const session = entities[sessionId];
		if (!session) {
			console.error("Invalid sessionId=", sessionId);
			return;
		}
		updateSession({ defaultCredits: session.defaultCredits });
	}

	function toggleDefaultCredit(day: number, slotIndex: number) {
		let credits = defaultCredits.slice();
		credits[day] = credits[day].slice();
		let i = creditOptions.indexOf(credits[day][slotIndex]);
		if (i < 0 || ++i >= creditOptions.length) i = 0;
		credits[day][slotIndex] = creditOptions[i];
		updateSession({ defaultCredits: credits });
	}

	return (
		<>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					paddingBottom: 10,
				}}
			>
				<CreditTotals defaultCredits={defaultCredits} />
				<RawSessionSelector
					onChange={importDefaultCreditsFromSession}
				/>
			</div>
			<CreditGrid nCol={dates.length} nRow={timeslots.length}>
				{dates.map((date, x) => (
					<GridColumnLabel
						key={date}
						style={{ gridArea: `1 / ${x + 2}` }}
						colIndex={x}
						date={date}
					/>
				))}
				{timeslots.map((timeslot, y) => (
					<GridRowLabel
						key={timeslot.id}
						style={{ gridArea: `${y + 2} / 1` }}
						rowIndex={y}
						label={timeslot.name}
					/>
				))}
				{dates.map((date, x) =>
					timeslots.map((timeslot, y) => (
						<GridCell
							key={date + timeslot.id}
							style={{ gridArea: `${y + 2} / ${x + 2}` }}
							colIndex={x}
							rowIndex={y}
						>
							<CreditButton
								style={{
									width: "100%",
									background: "transparent",
								}}
								onClick={() =>
									toggleDefaultCredit(x, y)
								}
								credit={defaultCredits[x][y]}
								disabled={readOnly}
							/>
						</GridCell>
					))
				)}
			</CreditGrid>
		</>
	);
}

export default SessionCredit;
