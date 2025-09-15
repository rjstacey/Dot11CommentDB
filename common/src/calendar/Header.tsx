import * as React from "react";
import { monthLabels } from "./utils";
import styles from "./calendar.module.css";

type HeaderProps = {
	onClickPrev: (e: React.MouseEvent) => void;
	onClickNext: (e: React.MouseEvent) => void;
	viewDate: { year: number; month: number };
	options: { dual: boolean };
};

function Header({ onClickPrev, onClickNext, viewDate, options }: HeaderProps) {
	const years = [viewDate.year];
	const months = [viewDate.month];
	if (options.dual) {
		const date = new Date(viewDate.year, viewDate.month + 1, 1);
		months.push(date.getMonth());
		if (viewDate.year !== date.getFullYear())
			years.push(date.getFullYear());
	}
	return (
		<div className={styles["header"]}>
			<button className="arrow-left" onClick={onClickPrev} />
			{years.map((year) => (
				<div
					key={year}
					className="label"
					style={{ width: `${100 / years.length}%` }}
				>
					{year}
				</div>
			))}
			{months.map((month) => (
				<div
					key={month}
					className="label"
					style={{ width: `${100 / months.length}%` }}
				>
					{monthLabels[month]}
				</div>
			))}
			<button className="arrow-right" onClick={onClickNext} />
		</div>
	);
}

export default Header;
