import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Select} from 'dot11-components/form'
import {loadVotingPools, selectVotingPoolsState, selectVotingPoolsOptions} from '../store/votingPools'

function VotingPoolSelector({
	value,
	onChange,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading} = useSelector(selectVotingPoolsState);
	const options = useSelector(selectVotingPoolsOptions);

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
			onChange={(values) => onChange(values.length? values[0].value: '')}
			portal={document.querySelector('#root')}
			dropdownPosition='auto'
			{...otherProps}
		/>
	)
}

VotingPoolSelector.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired
}

export default VotingPoolSelector;
