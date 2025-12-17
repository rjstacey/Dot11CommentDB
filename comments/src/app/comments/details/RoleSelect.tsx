import * as React from "react";
import { Dropdown, DropdownButton } from "react-bootstrap";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store";
import { selectGroupHeirarchy } from "@/store/groups";
import {
	selectCommentsBallot,
	selectRoleGroupId,
	setRoleGroupId,
} from "@/store/comments";

type Option = { label: string; value: string | null; disabled?: boolean };

export function RoleSelect() {
	const dispatch = useAppDispatch();
	const user = useAppSelector(selectUser);
	const ballot = useAppSelector(selectCommentsBallot);
	const groups = useAppSelector((state) =>
		ballot ? selectGroupHeirarchy(state, ballot.groupId) : []
	);
	const options = React.useMemo(() => {
		const options: Option[] = [{ label: "Member", value: null }];
		groups.forEach((g) => {
			if (g.officerSAPINs.includes(user.SAPIN))
				options.push({ label: `${g.name} Officer`, value: g.id });
		});
		return options;
	}, [groups, user.SAPIN]);

	const roleGroupId = useAppSelector(selectRoleGroupId);

	const option = options.find((o) => o.value === roleGroupId) ?? options[0];

	if (options.length <= 1) return null;

	return (
		<DropdownButton
			align="start"
			variant="outline-primary"
			title={"Role: " + option.label}
			disabled={options.length <= 1}
		>
			{options.map((option) => (
				<Dropdown.Item
					key={"" + option.value}
					active={option.value === roleGroupId}
					onClick={() => dispatch(setRoleGroupId(option.value))}
					disabled={option.disabled}
				>
					{option.label}
				</Dropdown.Item>
			))}
		</DropdownButton>
	);
}
