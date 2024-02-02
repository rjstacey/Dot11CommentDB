import * as React from "react";
import { Input } from "dot11-components";

function timeRangeToDuration(startTime: string, endTime: string) {
	let [startHstr, startMstr] = startTime.split(":");
	let [endHstr, endMstr] = endTime.split(":");
	try {
		let startH = startHstr ? parseInt(startHstr) : 0;
		let startM = startMstr ? parseInt(startMstr) : 0;
		let endH = endHstr ? parseInt(endHstr) : 0;
		let endM = endMstr ? parseInt(endMstr) : 0;
		let d = endH - startH + (endM - startM) / 60;
		if (d < 0) {
			// If less than zero, assume endTime is next day
			d = endH + 24 - startH + (endM - startM) / 60;
		}
		const hh = Math.floor(d);
		const mm = (d - hh) * 60;
		if (mm) return "" + hh + ":" + ("0" + mm).slice(-2);
		else return "" + hh;
	} catch (error) {
		return "";
	}
}

function endTimeFromDuration(startTime: string, duration: string) {
	let d: string | number = duration.trim();
	let m = /^(\d+):(\d{2})$/.exec(d);
	if (m) {
		d = parseInt(m[1]) + parseInt(m[2]) / 60;
	} else {
		m = /^(\d*\.?\d+)$/.exec(d);
		if (m) {
			d = parseFloat(d);
		} else {
			return undefined;
		}
	}
	let [startHstr, startMstr] = startTime.split(":");
	let startH = parseInt(startHstr);
	let startM = parseInt(startMstr);
	const endHour = startH + startM * 60 + d;
	let endH = Math.floor(endHour);
	const endM = (endHour - endH) * 60;
	// If endH is next day, then reduce by 24 hours
	if (endH >= 24) endH = endH - 24;
	return "" + endH + ":" + ("0" + endM).slice(-2);
}

type TimeRange = {
	startTime: string;
	endTime: string;
};

function InputTimeRangeAsDuration({
	entry,
	changeEntry,
	...otherProps
}: {
	entry: TimeRange;
	changeEntry: (changes: Partial<TimeRange>) => void;
} & Omit<
	React.ComponentProps<typeof Input>,
	"style" | "type" | "value" | "onChange"
>) {
	const [duration, setDuration] = React.useState(
		timeRangeToDuration(entry.startTime, entry.endTime) || ""
	);
	const [hasError, setHasError] = React.useState(false);

	React.useEffect(() => {
		const d = timeRangeToDuration(entry.startTime, entry.endTime);
		if (typeof d === "string") setDuration(d);
	}, [entry.startTime, entry.endTime]);

	function handleSetDuration(duration: string) {
		setDuration(duration);
		if (duration) {
			const endTime = endTimeFromDuration(entry.startTime, duration);
			if (endTime) {
				setHasError(false);
				if (endTime !== entry.endTime) changeEntry({ endTime });
			} else {
				setHasError(true);
			}
		}
	}

	const style = hasError ? { border: "1px dashed red" } : undefined;

	return (
		<Input
			style={style}
			type="search"
			value={duration}
			onChange={(e) => handleSetDuration(e.target.value)}
			{...otherProps}
		/>
	);
}

export default InputTimeRangeAsDuration;
