export const weekdayLabels: Record<number, string> = {
	0: "Su",
	1: "Mo",
	2: "Tu",
	3: "We",
	4: "Th",
	5: "Fr",
	6: "Sa",
};

export const monthLabels: Record<number, string> = {
	0: "January",
	1: "February",
	2: "March",
	3: "April",
	4: "May",
	5: "June",
	6: "July",
	7: "August",
	8: "September",
	9: "October",
	10: "November",
	11: "December",
};

const weekendMap: Record<number, boolean> = {
	0: true,
	1: false,
	2: false,
	3: false,
	4: false,
	5: false,
	6: true,
};

export const isWeekend = (day: number) => weekendMap[day] || false;

/* Order in which the week is displayed */
const weekdayOrder = [0, 1, 2, 3, 4, 5, 6];
//const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];

export const toISODate = (d: Date) =>
	"" +
	d.getFullYear() +
	"-" +
	("0" + (d.getMonth() + 1)).slice(-2) +
	"-" +
	("0" + d.getDate()).slice(-2);

/* Test if two dates are equal */
export const isEqual = (d1: Date, d2: Date) =>
	d1.getFullYear() === d2.getFullYear() &&
	d1.getMonth() === d2.getMonth() &&
	d1.getDate() === d2.getDate();

export type MonthGridDay = {
	isoDate: string;
	date: Date;
	isSelected: boolean;
	isToday: boolean;
	isWeekend: boolean;
	isInactive: boolean;
	isDisabled: boolean;
};

export function getMonthGrid({
	dates,
	viewDate,
	options,
}: {
	dates: string[];
	viewDate: { year: number; month: number };
	options: { minDate?: string; maxDate?: string; disablePast?: boolean };
}) {
	let today = new Date();
	today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const { year, month } = viewDate;
	const monthStart = new Date(year, month, 1);
	let day = -weekdayOrder.indexOf(monthStart.getDay()) + 1;
	const minDate = options.minDate && new Date(options.minDate);
	const maxDate = options.maxDate && new Date(options.maxDate);
	let matrix: Array<Array<MonthGridDay>> = [];
	for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
		matrix[rowIndex] = [];
		for (let colIndex = 0; colIndex < 7; colIndex++) {
			// The date constructor itself corrects for dates outside the current month
			const date = new Date(year, month, day);
			// inactive if the month is not the view month
			const isInactive = month !== date.getMonth();
			// disabled for various reasons, including if inactive
			let isDisabled = isInactive;
			if (options.disablePast && date < today) isDisabled = true;
			if (minDate && date < minDate) isDisabled = true;
			if (maxDate && date > maxDate) isDisabled = true;
			const isoDate = toISODate(date);
			const cell = {
				isoDate,
				date,
				isSelected: dates.findIndex((d: string) => d === isoDate) >= 0,
				isToday: isEqual(date, today),
				isWeekend: isWeekend(date.getDay()),
				isInactive,
				isDisabled,
			};
			matrix[rowIndex][colIndex] = cell;
			day++;
		}
	}
	return matrix;
}
