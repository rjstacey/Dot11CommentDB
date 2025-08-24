import { Select } from "@components/select";

import { useAppSelector } from "@/store/hooks";
import {
	selectGroup,
	getSubgroupTypes,
	GroupTypeLabels,
	GroupType,
} from "@/store/groups";

export function GroupTypeSelector({
	value,
	onChange,
	parent_id,
	...otherProps
}: {
	value: GroupType | null;
	onChange: (value: GroupType | null) => void;
	parent_id: string | null;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	const parentGroup = useAppSelector((state) =>
		parent_id ? selectGroup(state, parent_id) : undefined
	);

	const options = parentGroup
		? getSubgroupTypes(parentGroup.type!).map((type) => ({
				value: type,
				label: GroupTypeLabels[type],
		  }))
		: [];

	function handleChange(values: typeof options) {
		const newValue: GroupType | null =
			values.length > 0 ? values[0].value : null;
		if (newValue !== value) onChange(newValue);
	}

	//const values = GroupTypeOptions.filter((o) => o.value === value);
	const values = options.filter((o) => o.value === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			portal={document.querySelector("#root")}
			{...otherProps}
		/>
	);
}
