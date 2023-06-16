import React from "react";
import { Select, SelectRendererProps } from "dot11-components";
import { useAppSelector } from "../store/hooks";
import { selectGroupProjectOptions, GroupProjectOption } from '../store/ballots';

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
} & Omit<React.ComponentProps<typeof Select>, "values" | "options" | "onChange">
) {
	const options = useAppSelector(selectGroupProjectOptions)
		.filter(o => o.groupId === groupId);

	const values = options.filter(o => value === o.project);
    const handleChange = (values: typeof options) => onChange((values.length > 0 && values[0].project) || '');

	function createOption({state}: SelectRendererProps): GroupProjectOption {
		return {groupId: groupId, project: state.search, label: state.search};
	}

	return (
		<Select
			style={{minWidth: 100, width: 200}}
			values={values}
			options={options}
			onChange={handleChange}
			create
			createOption={createOption}
			clearable
			searchable
			dropdownPosition='auto'
			valueField='project'
			labelField='project'
			readOnly={readOnly || !groupId}
            {...otherProps}
		/>
	)
}

export default SelectProject;
