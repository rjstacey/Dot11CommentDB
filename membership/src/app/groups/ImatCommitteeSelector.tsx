import * as React from "react";
import { Select } from "@common";

import { useAppSelector } from "@/store/hooks";

import {
	selectImatCommittees,
	ImatCommitteeType,
} from "@/store/imatCommittees";

function ImatCommitteeSelector({
	value,
	onChange,
	type,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	type?: ImatCommitteeType;
} & Pick<
	React.ComponentProps<typeof Select>,
	"style" | "placeholder" | "readOnly"
>) {
	let options = useAppSelector(selectImatCommittees);
	if (type) options = options.filter((o) => o.type === type);

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
