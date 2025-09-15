import * as React from "react";

import Header from "./Header";
import Month from "./Month";

import styles from "./calendar.module.css";

export type ViewDate = {
	year: number;
	month: number;
};

const toViewDate = (date: Date): ViewDate => ({
	year: date.getFullYear(),
	month: date.getMonth(),
});

export type CalendarOptions = {
	disablePast: boolean;
	multi: boolean;
	dual: boolean;
	minDate: string | undefined;
	maxDate: string | undefined;
};

export type CalendarProps = {
	style?: React.CSSProperties;
	className?: string;
	value: Array<string>;
	onChange: (dates: Array<string>) => void;
	disablePast?: boolean;
	multi?: boolean;
	dual?: boolean;
	minDate?: string;
	maxDate?: string;
};

function Calendar({
	style,
	className,
	value: dates,
	onChange,
	disablePast = false,
	multi = false,
	dual = false,
	minDate,
	maxDate,
}: CalendarProps) {
	const [viewDate, setViewDate] = React.useState<ViewDate>(() =>
		toViewDate(new Date())
	);

	const onPrevClick = () =>
		setViewDate(toViewDate(new Date(viewDate.year, viewDate.month - 1, 1)));

	const onNextClick = () =>
		setViewDate(toViewDate(new Date(viewDate.year, viewDate.month + 1, 1)));

	const onDateClick = (date: string) => {
		let newDates;
		if (multi) {
			const i = dates.findIndex((d) => d === date);
			if (i >= 0) {
				newDates = dates.slice();
				newDates.splice(i, 1);
			} else {
				newDates = dates.concat(date);
			}
			newDates.sort();
		} else {
			newDates = [date];
		}

		onChange(newDates);
	};

	const options: CalendarOptions = {
		disablePast,
		multi,
		dual,
		minDate,
		maxDate,
	};

	return (
		<div
			style={style}
			className={styles["calendar"] + (className ? " " + className : "")}
		>
			<Header
				onClickPrev={onPrevClick}
				onClickNext={onNextClick}
				viewDate={viewDate}
				options={options}
			/>
			<div style={{ display: "flex" }}>
				<Month
					dates={dates}
					onDateClick={onDateClick}
					viewDate={viewDate}
					options={options}
				/>
				{dual && (
					<Month
						dates={dates}
						onDateClick={onDateClick}
						viewDate={toViewDate(
							new Date(viewDate.year, viewDate.month + 1, 1)
						)}
						options={options}
					/>
				)}
			</div>
		</div>
	);
}

/*
function validateISODate(props, propName, componentName) {
	const value = props[propName];
	if (value && !/\d{4}-\d{2}-\d{2}/.test(value))
		return new Error(
			`Invalid ${propName} supplied to ${componentName}. Expect string in form 'YYYY-MM-DD' but got ${value}.`
		);
}

Calendar.propTypes = {
	style: PropTypes.object,
	className: PropTypes.string,
	value: PropTypes.arrayOf(PropTypes.string).isRequired,
	onChange: PropTypes.func.isRequired,
	disablePast: PropTypes.bool,
	multi: PropTypes.bool,
	dual: PropTypes.bool,
	minDate: validateISODate,
	maxDate: validateISODate,
};

Calendar.defaultProps = {
	disablePast: false,
	multi: false,
	dual: false,
};
*/
export default Calendar;
