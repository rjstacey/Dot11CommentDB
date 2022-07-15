import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Select} from 'dot11-components/form';

import {loadMembers, selectMembersState} from '../store/members';

function selectMembersInfo(state) {
	const {valid, loading, ids, entities} = selectMembersState(state);
	const options = ids.map(id => {
		const member = entities[id];
		const label = `${member.SAPIN} ${member.Name || ''} (${member.Status})`;
		return {value: id, label}
	});
	return {valid, loading, options};
}

function MemberSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}) {
	const {valid, loading, options} = useSelector(selectMembersInfo);
	const dispatch = useDispatch();

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadMembers());
	}, [dispatch, valid, loading, readOnly]);

	const values = options.filter(o => o.value === value);

	const handleChange = (values) => onChange(values.length? values[0].value: 0);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			readOnly={readOnly}
			{...otherProps}
		/>
	)
}

MemberSelector.propTypes = {
	value: PropTypes.number,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default MemberSelector;