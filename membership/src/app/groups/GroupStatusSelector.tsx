import { Select } from "@common";

import { GroupStatusOptions } from "@/store/groups";

export function GroupStatusSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number;
	onChange: (value: number) => void;
} & Omit<
	React.ComponentPropsWithoutRef<
		typeof Select<(typeof GroupStatusOptions)[number]>
	>,
	"values" | "onChange" | "options" | "portal"
>) {
	function handleChange(values: typeof GroupStatusOptions) {
		const newValue = values.length > 0 ? values[0].value : 0;
		if (newValue !== value) onChange(newValue);
	}

	const values = GroupStatusOptions.filter((o) => o.value === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={GroupStatusOptions}
			portal={document.querySelector("#root")}
			{...otherProps}
		/>
	);
}
