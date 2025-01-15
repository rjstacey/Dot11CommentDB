import * as React from "react";
import { Select } from "dot11-components";
import { useAppSelector } from "@/store/hooks";
import { selectWebexAccountsState } from "@/store/webexAccounts";

function WebexTemplateSelector({
	value,
	onChange,
	accountId,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	accountId: number | null;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	const { loading, entities } = useAppSelector(selectWebexAccountsState);

	const options = React.useMemo(() => {
		const account = accountId ? entities[accountId] : undefined;
		return account?.templates || [];
	}, [accountId, entities]);

	const values = options.filter((o) => o.id === value);

	React.useEffect(() => {
		if (values.length === 0) {
			const defaults = options.filter((o) => o.isDefault);
			if (defaults.length > 0) onChange(defaults[0].id);
		}
	}, [options, onChange, values.length]);

	const handleChange = React.useCallback(
		(selected: typeof options) => {
			const id = selected.length > 0 ? selected[0].id : null;
			if (id !== value) onChange(id);
		},
		[value, onChange]
	);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			labelField="name"
			valueField="id"
			{...otherProps}
		/>
	);
}

export default WebexTemplateSelector;
