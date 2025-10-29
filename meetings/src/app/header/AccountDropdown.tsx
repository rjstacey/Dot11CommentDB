import { Dropdown } from "react-bootstrap";
import { loginAndReturn } from "@common";
import { resetStore, persistor, selectUser, setUser } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import pkg from "../../../package.json" with { type: "json" };

export function AccountDropdown({ className }: { className?: string }) {
	const dispatch = useAppDispatch();
	const user = useAppSelector(selectUser);
	const reload = async () => {
		dispatch(resetStore());
		dispatch(setUser(user));
		await persistor.flush();
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
