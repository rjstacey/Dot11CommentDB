import React from 'react';

import {useAppDispatch, useAppSelector} from '../store/hooks';

import {Select} from 'dot11-components';

import {selectImatCommitteesState, loadCommittees} from '../store/imatCommittees';

function ImatCommitteeSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {
	const dispatch = useAppDispatch();
	const {valid, entities, ids} = useAppSelector(selectImatCommitteesState);
	
	React.useEffect(() => {
		if (!valid)
			dispatch(loadCommittees('802.11'));
	}, [dispatch, valid]);

	const options = React.useMemo(() => ids.map(id => entities[id]!), [ids, entities]);

	const values = options.filter(o => o.symbol === value);

	const handleChange = React.useCallback((values: typeof options) => onChange(values.length? values[0].symbol: null), [onChange]);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			valueField='symbol'
			labelField='shortName'
			{...otherProps}
		/>
	)
}

export default ImatCommitteeSelector;
