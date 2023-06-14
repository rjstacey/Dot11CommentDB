import React from 'react';
import { Select } from 'dot11-components';

const positions = ["Chair", "Vice chair", "Secretary", "Technical editor", "Other"];

interface SelectOption {
	value: string;
	label: string;
}

function OfficerPositionSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const options: SelectOption[] = positions.map(v => ({value: v, label: v}));
	const values = options.filter(o => o.value === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].value: '');

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

export default OfficerPositionSelector;
