
export const weekdayLabels = {
	0: 'Su',
	1: 'Mo',
	2: 'Tu',
	3: 'We',
	4: 'Th',
	5: 'Fr',
	6: 'Sa',
};

export const monthLabels = {
	0: 'January',
	1: 'February',
	2: 'March',
	3: 'April',
	4: 'May',
	5: 'June',
	6: 'July',
	7: 'August',
	8: 'September',
	9: 'October',
	10: 'November',
	11: 'December',
};

const weekendMap = {
	0: true,
	1: false,
	2: false,
	3: false,
	4: false,
	5: false,
	6: true
};

export const isWeekend = day => weekendMap[day] || false;

/* Order in which the week is displayed */
const weekdayOrder = [0, 1, 2, 3, 4, 5, 6];
//const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];


/* Test if two dates are equal */
export const isEqual = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

export function getMonthGrid({
		selectedDates,
		viewDate,
		options,
}) {
	let today = new Date();
	today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const month = viewDate.getMonth();
	const year = viewDate.getFullYear();
	const monthStart = new Date(year, month, 1);
	let day = -weekdayOrder.indexOf(monthStart.getDay()) + 1;
	let matrix = [];
	for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
		matrix[rowIndex] = [];
		for (let colIndex = 0; colIndex < 7; colIndex++) {
			// The date constructor itself corrects for dates outside the current month
			const date = new Date(year, month, day);
			// inactive if the month is not the view month
			const isInactive = month !== date.getMonth();
			// disabled for various reasons, including if inactive
			let isDisabled = isInactive;
			if (options.disablePast && date < today)
				isDisabled = true;
			if (options.minDate && date < options.minDate)
				isDisabled = true;
			if (options.maxDate && date > options.maxDate)
				isDisabled = true;
			const cell = {
				date,
				isSelected: selectedDates.findIndex(d => isEqual(d, date)) >= 0,
				isToday: isEqual(date, today),
				isWeekend: isWeekend(date.getDay()),
				isInactive,
				isDisabled,
			}
			matrix[rowIndex][colIndex] = cell;
			day++;
		}
	}
	return matrix;
}
