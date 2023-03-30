import React from 'react';

import { Select } from 'dot11-components';

import { StatusOptions } from '../store/members';

function StatusSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange"| "options" | "portal">
) {
	const values = StatusOptions.filter(o => o.value === value);
	const handleChange = (values: typeof StatusOptions) => onChange(values.length === 0? '': values[0].value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={StatusOptions}
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

export default StatusSelector;
