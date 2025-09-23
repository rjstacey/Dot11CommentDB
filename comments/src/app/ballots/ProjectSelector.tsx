import * as React from "react";
import { Select, SelectRendererProps } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectGroupProjectOptions, GroupProjectOption } from "@/store/ballots";

function SelectProject({
	value,
	onChange,
	groupId,
	readOnly,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
	groupId: string | null;
	readOnly?: boolean;
} & Pick<
	React.ComponentProps<typeof Select>,
	| "placeholder"
	| "readOnly"
	| "disabled"
	| "style"
	| "id"
	| "className"
	| "isInvalid"
>) {
	const existingOptions = useAppSelector(selectGroupProjectOptions);
	const [options, setOptions] = React.useState<GroupProjectOption[]>([]);

	React.useEffect(() => {
		setOptions(existingOptions.filter((o) => o.groupId === groupId));
	}, [existingOptions, groupId]);

	const values = options.filter((o) => value === o.project);
	if (value && values.length === 0) {
		const option: GroupProjectOption = {
			groupId: groupId,
			project: value,
			label: value,
		};
		setOptions(options.concat(option));
	}

	const handleChange = (values: typeof options) =>
		onChange((values.length > 0 && values[0].project) || "");

	async function createOption({
		state,
	}: SelectRendererProps<GroupProjectOption>) {
		const option: GroupProjectOption = {
			groupId: groupId,
			project: state.search,
			label: state.search,
		};
		setOptions(options.concat(option));
		return option;
	}

	return (
		<Select
			style={{ minWidth: 100, width: 200 }}
			values={values}
			options={options}
			onChange={handleChange}
			create
			createOption={createOption}
			clearable
			searchable
			dropdownPosition="auto"
			valueField="project"
			labelField="project"
			readOnly={readOnly || !groupId}
			{...otherProps}
		/>
	);
}

export default SelectProject;
