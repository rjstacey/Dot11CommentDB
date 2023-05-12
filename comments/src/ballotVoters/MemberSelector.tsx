import React from 'react';
import { Select } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getMembers, selectMembersState, selectMembers } from '../store/members';

function MemberSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}: {
	value: number;
	onChange: (value: number) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const dispatch = useAppDispatch();
	const {loading} = useAppSelector(selectMembersState);
	const options = useAppSelector(selectMembers);

	React.useEffect(() => {
		dispatch(getMembers());
	}, [dispatch]);

	const values = options.filter(o => o.SAPIN === value);

	const handleChange = (values: typeof options) => onChange(values.length? values[0].SAPIN: 0);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			valueField='SAPIN'
			labelField='Name'
			readOnly={readOnly}
			{...otherProps}
		/>
	)
}

export default MemberSelector;