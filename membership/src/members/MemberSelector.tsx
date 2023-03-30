import React from 'react';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import { Select } from 'dot11-components';

import { loadMembers, selectMembersState } from '../store/members';

function MemberSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	readOnly?: boolean;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options" | "loading" | "clearable" | "readOnly">
) {
	const dispatch = useAppDispatch();
	const {valid, loading, ids, entities} = useAppSelector(selectMembersState);

	React.useEffect(() => {
		if (!valid && !readOnly)
			dispatch(loadMembers());
	}, [dispatch, valid, readOnly]);

	const options: {value: number; label: string}[] = React.useMemo(() => 
		ids.map(id => {
			const member = entities[id]!;
			const label = `${member.SAPIN} ${member.Name || ''} (${member.Status})`;
			return {value: id as number, label}
		})
	, [ids, entities]);

	const values = options.filter(o => o.value === value);

	function handleChange(values: typeof options) {
		const newValue = values.length > 0? values[0].value: null;
		if (newValue !== value)
			onChange(newValue);
	}

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