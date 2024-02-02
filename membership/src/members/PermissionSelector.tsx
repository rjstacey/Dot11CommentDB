import * as React from "react";
import { useAppSelector } from "../store/hooks";
import { Select } from "dot11-components";
import { selectPermissions } from "../store/permissions";

function PermissionSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options" | "valueField" | "labelField" | "portal"
>) {
	const permissions = useAppSelector(selectPermissions);
	const values = permissions.filter((o) => o.scope === value);
	const handleChange = (values: typeof permissions) =>
		onChange(values.length === 0 ? null : values[0].scope);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={permissions}
			valueField="scope"
			labelField="description"
			portal={document.querySelector("#root")}
			{...otherProps}
		/>
	);
}

export default PermissionSelector;
