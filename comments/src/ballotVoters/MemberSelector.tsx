import React from 'react';
import { Select } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadMembers, selectMembersState } from '../store/members';
import { RootState } from '../store';

function selectMembersInfo(state: RootState) {
	const {valid, loading, ids, entities} = selectMembersState(state);
	const options = ids.map(id => {
		const member = entities[id]!;
		const label = `${member.SAPIN} ${member.Name || ''} (${member.Status})`;
		return {value: id as number, label}
	});
	return {valid, loading, options};
}

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
	const {valid, loading, options} = useAppSelector(selectMembersInfo);
	const dispatch = useAppDispatch();

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadMembers());
	}, [dispatch, valid, loading, readOnly]);

	const values = options.filter(o => o.value === value);

	const handleChange = (values: typeof options) => onChange(values.length? values[0].value: 0);

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

export default MemberSelector;