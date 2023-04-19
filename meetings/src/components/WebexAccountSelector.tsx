import React from 'react';
import { Select } from 'dot11-components';
import { useAppSelector } from '../store/hooks';

import { selectWebexAccountsState } from '../store/webexAccounts';

function WebexAccountSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const {loading, ids, entities} = useAppSelector(selectWebexAccountsState);
	const options = React.useMemo(() => ids.map(id => entities[id]!), [ids, entities]);
	const values = options.filter(o => o.id === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].id: null);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			labelField='name'
			valueField='id'
			{...otherProps}
		/>
	)
}

export default WebexAccountSelector;
