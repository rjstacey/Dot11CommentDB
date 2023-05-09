import React from 'react';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { Select } from 'dot11-components'
import { loadVotingPools, selectVotingPoolsState, selectVotingPoolsOptions } from '../store/votingPools'

function VotingPoolSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string | null;
	onChange: (value: string | null) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">) {
	const dispatch = useAppDispatch();
	const {valid, loading} = useAppSelector(selectVotingPoolsState);
	const options = useAppSelector(selectVotingPoolsOptions);

	React.useEffect(() => {
		if (!valid && !loading)
			dispatch(loadVotingPools());
	}, [dispatch, valid, loading]);

	const values = options.filter(o => o.value === value);

	return (
		<Select
			values={values}
			options={options}
			loading={loading}
			onChange={(values) => onChange(values.length? values[0].value: null)}
			portal={document.querySelector('#root')}
			dropdownPosition='auto'
			{...otherProps}
		/>
	)
}

export default VotingPoolSelector;
