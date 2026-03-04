import { useCallback, type ComponentProps } from "react";
import { Select } from "@common";
import { officerPositionsForGroupType } from "@/store/officers";
import { GroupType } from "@/store/groups";

function OfficerPositionSelector({
	value,
	onChange,
	groupType,
	...props
}: {
	value: string;
	onChange: (value: string) => void;
	groupType: GroupType;
} & Partial<Pick<ComponentProps<typeof Select>, "id" | "style" | "readOnly">>) {
	const options = officerPositionsForGroupType(groupType).map((v) => ({
		value: v,
		label: v,
	}));
	if (value && !options.find((o) => o.value === value))
		options.push({ value, label: value });
	const values = options.filter((o) => o.value === value);
	const handleChange = useCallback(
		(values: typeof options) =>
			onChange(values.length > 0 ? values[0].value : ""),
		[onChange],
	);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			portal={document.querySelector("#root")}
			{...props}
		/>
	);
}

export default OfficerPositionSelector;
