import { Dropdown } from "react-bootstrap";

import { clearUser } from "@common";

import { resetStore } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/user";

import pkg from "../../../package.json";

export function AccountDropdown() {
	const dispatch = useAppDispatch();
	const user = useAppSelector(selectUser);
	const signOut = () => {
		dispatch(resetStore());
		clearUser();
	};

	return (
		<Dropdown id="basic-nav-dropdown">
			<Dropdown.Toggle variant="outline-secondary" id="dropdown-basic">
				{`${user.Name} (${user.SAPIN})`}
			</Dropdown.Toggle>
			<Dropdown.Menu align="end">
				<Dropdown.ItemText>
					{pkg.name}:&nbsp;{pkg.version}
				</Dropdown.ItemText>
				<Dropdown.ItemText>{user.Email}</Dropdown.ItemText>
				<Dropdown.Divider />
				<Dropdown.Item onClick={signOut}>Sign Out</Dropdown.Item>
			</Dropdown.Menu>
		</Dropdown>
	);
}
