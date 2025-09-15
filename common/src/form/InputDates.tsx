import * as React from "react";
import { ActionIcon } from "../icons";
import Calendar from "../calendar";
import TextArea from "./TextArea";
import { Dropdown } from "react-bootstrap";

import styles from "./form.module.css";

const months = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

const toISODate = (d: Date) =>
	"" +
	d.getFullYear() +
	"-" +
	("0" + (d.getMonth() + 1)).slice(-2) +
	"-" +
	("0" + d.getDate()).slice(-2);

function toDatesStr(dates: Array<string>) {
	let currentMonth: string = "";
	const list: Array<string> = [];
	const rx = /(\d{4})-(\d{2})-(\d{2})/;
	for (const date of dates) {
		const m = rx.exec(date);
		if (m) {
			const month = m[2];
			const day = m[3];
			let s = "" + parseInt(day, 10);
			if (month !== currentMonth) {
				s = months[parseInt(month, 10) - 1] + " " + s;
				currentMonth = month;
			}
			list.push(s);
		}
	}
	return list.join(", ");
}

type InputDatesProps = {
	id?: string;
	className?: string;
	style?: React.CSSProperties;
	value?: Array<string>;
	onChange?: (value: Array<string>) => void;
	disabled?: boolean;
	multi?: boolean;
	dual?: boolean;
	disablePast?: boolean;
	placeholder?: string;
};

function InputDates({
	id,
	className,
	style,
	value,
	onChange,
	disabled,
	multi,
	dual,
	disablePast,
	placeholder,
}: InputDatesProps) {
	const [uncontrolledValue, setUncontrolledValue] = React.useState<
		Array<string>
	>([]);
	const dates = value || uncontrolledValue;
	const setDates = onChange || setUncontrolledValue;
	const [datesStr, setDatesStr] = React.useState(toDatesStr(dates));
	const [textareaHasFocus, setTextareaHasFocus] = React.useState(false);

	React.useEffect(() => {
		if (!textareaHasFocus) {
			const str = toDatesStr(dates);
			if (str !== datesStr) setDatesStr(str);
		}
	}, [textareaHasFocus, dates, datesStr]);

	const { minDate, maxDate } = React.useMemo(() => {
		const today = new Date();
		const minDate = toISODate(
			new Date(today.getFullYear(), today.getMonth(), 1)
		);
		const maxDate = toISODate(
			new Date(today.getFullYear() + 1, today.getMonth(), 0)
		);
		return { minDate, maxDate };
	}, []);

	placeholder = placeholder || (multi ? "Month dd, dd, etc." : "Month dd");

	function changeDatesStr(str: string) {
		const dates: Array<string> = [];
		const now = new Date();
		let currentMonth = now.getMonth();
		let currentYear = now.getFullYear();
		let strArray = str.split(",");
		if (!multi) strArray = strArray.slice(0, 1);
		const rx = /([A-Za-z]*)\s*([\d]+)/i;
		for (let s of strArray) {
			let date: string | null = null;
			s = s.trim();
			const matches = rx.exec(s);
			if (matches) {
				const monthStr = matches[1];
				const dayStr = matches[2];
				if (monthStr) {
					currentMonth = months.findIndex(
						(m) =>
							m.toLowerCase() ===
							monthStr.substring(0, 3).toLowerCase()
					);
					if (currentMonth < now.getMonth())
						currentYear = now.getFullYear() + 1;
				}
				if (currentMonth >= 0 && dayStr)
					date = toISODate(
						new Date(currentYear, currentMonth, parseInt(dayStr))
					);
			}
			if (date) dates.push(date);
		}
		dates.sort();
		setDates(dates);
		setDatesStr(str);
	}

	function changeDatesArray(dates: string[]) {
		setDatesStr(toDatesStr(dates));
		setDates(dates);
	}

	return (
		<div
			className={
				"form-control " +
				styles["input-dates"] +
				(disabled ? " disabled" : "") +
				(className ? " " + className : "")
			}
			style={style}
		>
			<TextArea
				id={id}
				className={"textarea" + (dates.length === 0 ? " invalid" : "")}
				value={datesStr}
				onChange={(e) => changeDatesStr(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
				onFocus={() => setTextareaHasFocus(true)}
				onBlur={() => setTextareaHasFocus(false)}
			/>
			<i
				className={"bi-x icon" + (datesStr ? " active" : "")}
				onClick={disabled ? undefined : () => changeDatesArray([])}
			/>
			<Dropdown>
				<Dropdown.Toggle
					as="i"
					className="bi-calendar icon action"
					disabled={disabled}
				/>
				<Dropdown.Menu>
					<Calendar
						multi={multi}
						dual={dual}
						disablePast={disablePast}
						minDate={minDate}
						maxDate={maxDate}
						value={dates}
						onChange={changeDatesArray}
					/>
				</Dropdown.Menu>
			</Dropdown>
		</div>
	);
}

/*
function validateISODate(
	props: object,
	propName: string,
	componentName: string
) {
	const value = props[propName];
	if (value && /%d{4}-%d{2}-%d{2}/.test(value))
		return new Error(
			`Invalid prop ${propName} supplied to ${componentName}. Expect string in form 'YYYY-MM-DD'.`
		);
}

InputDates.propTypes = {
	value: validateISODate,
	onChange: PropTypes.func,
	disabled: PropTypes.bool,
	multi: PropTypes.bool,
	dual: PropTypes.bool,
	disablePast: PropTypes.bool,
};
*/

export default InputDates;
