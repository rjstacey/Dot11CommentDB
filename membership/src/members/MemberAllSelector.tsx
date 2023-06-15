import React from 'react';

import { Select } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { selectAllMembers, Member } from '../store/members';

const renderMember = ({item: member}: {item: Member}) => `${member.SAPIN} ${member.Name || ''} (${member.Status})`;

function MemberSelector({
	value,
	onChange,
	readOnly,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	readOnly?: boolean;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options" | "clearable" | "readOnly">
) {
	const options = useAppSelector(selectAllMembers);
	const values = options.filter(o => o.SAPIN === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].SAPIN: null)

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			clearable
			valueField='SAPIN'
			itemRenderer={renderMember}
			selectItemRenderer={renderMember}
			readOnly={readOnly}
			{...otherProps}
		/>
	)
}

export default MemberSelector;