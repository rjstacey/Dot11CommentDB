import React from 'react';
import {useAppDispatch, useAppSelector} from '../store/hooks';

import {Select, strComp} from 'dot11-components';

import {loadMembers, selectMembersState} from '../store/members';

function MemberSelector({
	value,		// value is SAPIN
	onChange,
	readOnly,
	...otherProps
}: {
	value: number;
	onChange: (value: number) => void;
	readOnly?: boolean;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const dispatch = useAppDispatch();
	const {valid, loading, ids: userIds, entities: userEntities} = useAppSelector(selectMembersState);

	React.useEffect(() => {
		if (!valid && !loading && !readOnly)
			dispatch(loadMembers());
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	const options = React.useMemo(() => {
		// Produce a unique set of SAPIN/Name mappings. If there is no SAPIN then the name is the key.
		const userOptions =	userIds
			.map((sapin) => ({value: sapin, label: userEntities[sapin]!.Name || ''}))
			.sort((a, b) => strComp(a.label, b.label));
		return userOptions;
	}, [userEntities, userIds]);

	const values = options.filter((o) => o.value === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].value as number: 0);

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

export default MemberSelector;
