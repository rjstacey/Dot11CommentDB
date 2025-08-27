import { Dropdown } from "react-bootstrap";

import { loginAndReturn } from "@components/lib";

import { resetStore } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser, setUser } from "@/store/user";

import pkg from "../../package.json";

export function AccountDropdown() {
	const dispatch = useAppDispatch();
	const user = useAppSelector(selectUser)!;
	const clearCache = () => {
		dispatch(resetStore());
		dispatch(setUser(user));
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
				<Dropdown.Item onClick={clearCache}>Clear Cache</Dropdown.Item>
				<Dropdown.Item onClick={loginAndReturn}>Sign Out</Dropdown.Item>
			</Dropdown.Menu>
		</Dropdown>
	);
}
