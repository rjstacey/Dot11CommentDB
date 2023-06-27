import { Select } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { selectWebexAccounts } from '../store/webexAccounts';

function WebexAccountSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const options = useAppSelector(selectWebexAccounts);
	const values = options.filter(o => o.id === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].id: null);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			labelField='name'
			valueField='id'
			{...otherProps}
		/>
	)
}

export default WebexAccountSelector;
