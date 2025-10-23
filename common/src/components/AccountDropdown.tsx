import { Dropdown } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { loginAndReturn } from "../lib";
import { selectUser, setUser, resetStore } from "../store";

import pkg from "../../../package.json";

export function AccountDropdown({ className }: { className?: string }) {
	const dispatch = useDispatch();
	const user = useSelector(selectUser);
	const reload = () => {
		dispatch(resetStore());
		dispatch(setUser(user));
		window.location.reload();
	};

	return (
		<Dropdown id="account-dropdown" className={className}>
			<Dropdown.Toggle
				variant="outline-secondary"
				id="account-dropdown-toggle"
			>
				{`${user.Name} (${user.SAPIN})`}
			</Dropdown.Toggle>
			<Dropdown.Menu align="end">
				<Dropdown.ItemText>
					{pkg.name}:&nbsp;{pkg.version}
				</Dropdown.ItemText>
				<Dropdown.ItemText>{user.Email}</Dropdown.ItemText>
				<Dropdown.Divider />
				<Dropdown.Item onClick={reload}>Clear and Reload</Dropdown.Item>
				<Dropdown.Item onClick={loginAndReturn}>Sign Out</Dropdown.Item>
			</Dropdown.Menu>
		</Dropdown>
	);
}
