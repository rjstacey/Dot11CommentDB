import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux'
import {Select} from 'dot11-components/form'

import {loadMembers, selectMembersState} from '../store/members';

function MemberSelector({
	style,
	className,
	value,
	onChange,
	readOnly,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading, ids, entities} = useSelector(selectMembersState);

	React.useEffect(() => {
		if (!valid && !readOnly)
			dispatch(loadMembers());
	}, [dispatch, valid, readOnly]);

	const options = React.useMemo(() => 
		ids.map(id => {
			const member = entities[id];
			const label = `${member.SAPIN} ${member.Name || ''} (${member.Status})`;
			return {value: id, label}
		})
	, [ids, entities]);

	const values = options.filter(o => o.value === value);

	function handleChange(values) {
		const newValue = values.length > 0? values[0].value: null;
		if (newValue !== value)
			onChange(newValue);
	}

	return (
		<Select
			style={style}
			className={className}
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