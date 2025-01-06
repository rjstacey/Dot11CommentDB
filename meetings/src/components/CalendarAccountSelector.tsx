import { Select } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { selectCalendarAccounts } from "@/store/calendarAccounts";

function CalendarAccountSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	const options = useAppSelector(selectCalendarAccounts);
	const values = options.filter((o) => o.id === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? (values[0].id as number) : null);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			valueField="id"
			labelField="name"
			{...otherProps}
		/>
	);
}

export default CalendarAccountSelector;
