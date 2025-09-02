import { useNavigate, useParams } from "react-router";

import { Select } from "@common";

import { useAppSelector } from "@/store/hooks";
import { selectTopLevelGroups } from "@/store/groups";

export function PathWorkingGroupSelector() {
	const navigate = useNavigate();
	const { groupName } = useParams();

	const options = useAppSelector(selectTopLevelGroups);
	const values = options.filter((g) => g.name === groupName);

	function handleChange(values: typeof options) {
		const pathName = "/" + (values.length > 0 ? values[0].name : "");
		navigate(pathName);
	}

	return (
		<Select
			className="working-group-select"
			dropdownClassName="working-group-select-dropdown"
			values={values}
			onChange={handleChange}
			options={options}
			valueField="id"
			labelField="name"
			searchable={false}
		/>
	);
}

export default PathWorkingGroupSelector;
