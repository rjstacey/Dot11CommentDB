import * as React from "react";
import { Select } from "@common";

import { useAppSelector } from "@/store/hooks";
import { selectImatCommmittees } from "@/store/imatBreakouts";

function ImatCommitteeSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "id" | "placeholder" | "className" | "style"
>) {
	const options = useAppSelector(selectImatCommmittees);
	const values = options.filter((o) => o.symbol === value);
	const handleChange = React.useCallback(
		(values: typeof options) =>
			onChange(values.length ? values[0].symbol : null),
		[onChange]
	);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			valueField="symbol"
			labelField="shortName"
			{...otherProps}
		/>
	);
}

export default ImatCommitteeSelector;
