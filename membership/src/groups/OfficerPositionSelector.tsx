import React from 'react';
import { Select } from 'dot11-components';
import { officerPositions } from '../store/officers';

function OfficerPositionSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	let options = officerPositions.map(v => ({value: v, label: v}));
	if (value && !options.find(o => o.value === value))
		options.push({value, label: value});
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
