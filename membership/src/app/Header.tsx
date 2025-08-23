import React from "react";
import { NavLink, useParams } from "react-router";
import { Navbar, Nav, Container, Dropdown } from "react-bootstrap";

import { loginAndReturn } from "dot11-components";

import { resetStore } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser, setUser } from "@/store/user";

import { AccessLevel } from "@/store/user";
import { selectWorkingGroup } from "@/store/groups";
import { selectSessionAttendeesSession } from "@/store/sessionAttendees";

import pkg from "../../package.json";

type MenuItem = {
	link: string;
	label: string;
};

function useMenuLinks() {
	//const groupName = useParams().groupName || "";
	const group = useAppSelector(selectWorkingGroup);
	const session = useAppSelector(selectSessionAttendeesSession);

	// Only display links for which the use has permissions
	// Replace params with the current setting
	return React.useMemo(() => {
		const menu: MenuItem[] = [];

		// No menu items if there is no group
		if (!group) return menu;

		// Groups link for "root" (/groups) or committee/working group ("/:groupName/groups")
		const groupsAccess = group.permissions.groups || AccessLevel.none;
		if (groupsAccess >= AccessLevel.ro) {
			menu.push({
				link: `/${group.name}/groups`,
				label: "Groups",
			});
		}

		const membersAccess = group.permissions.members || AccessLevel.none;

		if (membersAccess >= AccessLevel.ro) {
			menu.push({
				link: `/${group.name}/members`,
				label: "Members",
			});
		}

		if (membersAccess >= AccessLevel.admin) {
			menu.push({
				link: `/${group.name}/sessionParticipation`,
				label: "Session participation",
			});
			menu.push({
				link: `/${group.name}/ballotParticipation`,
				label: "Ballot participation",
			});
			menu.push({
				link:
					`/${group.name}/sessionAttendance` +
					(session?.number ? `/${session.number}` : ""),
				label: "Session attendance",
			});
			menu.push({
				link: `/${group.name}/notification`,
				label: "Notification",
			});
		}

		if (membersAccess >= AccessLevel.ro) {
			menu.push({
				link: `/${group.name}/affiliationMap`,
				label: "Affiliation map",
			});
			menu.push({
				link: `/${group.name}/reports`,
				label: "Reports",
			});
		}

		return menu;
	}, [group, session]);
}

function AccountDropdown() {
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

function Header() {
	const { groupName } = useParams();

	const title = (groupName ? groupName + " " : "") + "Membership";
	if (document.title !== title) document.title = title;

	const rootPath = "" + (groupName || "");

	const menu = useMenuLinks();
	const menuItems = menu.map((item) => (
		<Nav.Link as={NavLink} key={item.link} to={item.link}>
			{item.label}
		</Nav.Link>
	));

	return (
		<Container
			as="header"
			fluid
			className="d-flex flex-row justify-content-between align-items-center bg-body-tertiary "
		>
			<Navbar expand="xl" className="justify-content-between">
				<Navbar.Brand as={NavLink} to={rootPath}>
					{title}
				</Navbar.Brand>
				<Navbar.Toggle aria-controls="basic-navbar-nav" />
				<Navbar.Collapse id="basic-navbar-nav">
					<Nav className="me-auto">{menuItems}</Nav>
				</Navbar.Collapse>
			</Navbar>
			<AccountDropdown />
		</Container>
	);
}

export default Header;
