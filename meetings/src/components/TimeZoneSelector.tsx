import * as React from "react";
import { Select } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectTimeZonesState } from "@/store/timeZones";

function TimeZoneSelector({
	value,
	onChange,
	...props
}: {
	value: string;
	onChange: (value: string) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "id" | "placeholder" | "className" | "style"
>) {
	const { timeZones } = useAppSelector(selectTimeZonesState);

	const options = React.useMemo(
		() => timeZones.map((tz: string) => ({ value: tz, label: tz })),
		[timeZones]
	);

	const handleChange = onChange
		? (values: typeof options) =>
				onChange(values.length > 0 ? values[0].value : "")
		: undefined;
	const values = options.filter((o) => o.value === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			{...props}
		/>
	);
}

export default TimeZoneSelector;
