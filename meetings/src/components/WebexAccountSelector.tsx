import { Select } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectWebexAccounts } from "@/store/webexAccounts";

function WebexAccountSelector({
	value,
	onChange,
	...props
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	| "readOnly"
	| "disabled"
	| "id"
	| "placeholder"
	| "className"
	| "style"
	| "isInvalid"
>) {
	const options = useAppSelector(selectWebexAccounts);
	const values = options.filter((o) => o.id === value);
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].id : null);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			labelField="name"
			valueField="id"
			{...props}
		/>
	);
}

export default WebexAccountSelector;
