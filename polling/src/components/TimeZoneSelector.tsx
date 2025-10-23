import * as React from "react";

import { Select } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadTimeZones, selectTimeZonesState } from "@/store/timeZones";

function TimeZoneSelector({
	value,
	onChange,
	...props
}: {
	value: string;
	onChange: (value: string) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"className" | "style" | "readOnly" | "disabled" | "id"
>) {
	const dispatch = useAppDispatch();
	const { valid, loading, timeZones } = useAppSelector(selectTimeZonesState);

	React.useEffect(() => {
		if (!valid && !loading) dispatch(loadTimeZones());
	}, []);

	const options = React.useMemo(
		() => timeZones.map((tz: string) => ({ value: tz, label: tz })),
		[timeZones]
	);

	function handleChange(values: typeof options) {
		onChange(values.length > 0 ? values[0].value : "");
	}
	const values = options.filter((o) => o.value === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			{...props}
		/>
	);
}

export default TimeZoneSelector;
