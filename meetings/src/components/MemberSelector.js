import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Select} from 'dot11-components/form';
import {strComp} from 'dot11-components/lib';

import {loadMembers, selectMembersState} from '../store/members';

function MemberSelector({
	value,		// value is SAPIN
	onChange,
	readOnly,
	...otherProps
}) {
	const dispatch = useDispatch();
	const {valid, loading, ids: userIds, entities: userEntities} = useSelector(selectMembersState);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadMembers());
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	const options = React.useMemo(() => {
		// Produce a unique set of SAPIN/Name mappings. If there is no SAPIN then the name is the key.
		const userOptions =	userIds
			.map(sapin => ({value: sapin, label: userEntities[sapin].Name}))
			.sort((a, b) => strComp(a.label, b.label));
		return userOptions;
	}, [userEntities, userIds]);

	const values = options.filter(o => o.value === value);
	const handleChange = (values) => onChange(values.length > 0? values[0].value: 0);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			create
			clearable
			readOnly={readOnly}
			portal={document.querySelector('#root')}
			{...otherProps}
		/>
	)
}

MemberSelector.propTypes = {
	value: PropTypes.number,
	onChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

export default MemberSelector;
