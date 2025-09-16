import * as React from "react";
import { NavLink, useParams, useLocation, useMatch } from "react-router";
import { Navbar, Nav } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import { selectTopLevelGroupByName } from "@/store/groups";
import { selectCurrentSession } from "@/store/sessions";
import { selectBreakoutMeetingId } from "@/store/imatBreakouts";

type MenuItem = {
	link: string;
	label: string;
};

function useMenuLinks() {
	const groupName = useParams().groupName || "*";
	const group = useAppSelector((state) =>
		selectTopLevelGroupByName(state, groupName!)
	);
	const access = group?.permissions.meetings || AccessLevel.none;
	const session = useAppSelector(selectCurrentSession);
	const imatBreakoutMeetingId = useAppSelector(selectBreakoutMeetingId);

	const menu: MenuItem[] = React.useMemo(() => {
		const menu: MenuItem[] = [];

		// No menu items if there is no group
		if (!group) return menu;

		if (access >= AccessLevel.admin) {
			menu.push({
				link: `/${group.name}/accounts`,
				label: "Accounts",
			});
		}

		if (access >= AccessLevel.ro) {
			menu.push({
				link: `/${group.name}/sessions`,
				label: "Sessions",
			});
			menu.push({
				link:
					`/${group.name}/meetings` +
					(session ? `/${session.number}` : ""),
				label: "Meetings",
			});
			menu.push({
				link:
					`/${group.name}/webexMeetings` +
					(session ? `/${session.number}` : ""),
				label: "Webex",
			});
			menu.push({
				link:
					`/${group.name}/imatBreakouts` +
					(imatBreakoutMeetingId ? `/${imatBreakoutMeetingId}` : ""),
				label: "IMAT breakouts",
			});
			menu.push({
				link: `/${group.name}/imatMeetings`,
				label: "IMAT sessions",
			});
			menu.push({
				link: `/${group.name}/calendar`,
				label: "Calendar",
			});
			menu.push({
				link: `/${group.name}/ieee802World`,
				label: "802 World",
			});
			menu.push({
				link:
					`/${group.name}/reports` +
					(session ? `/${session.number}` : ""),
				label: "Reports",
			});
		}
		return menu;
	}, [access, group, session, imatBreakoutMeetingId]);

	return menu;
}

function AppNavLink({
	to,
	eventKey,
	children,
}: {
	to: string;
	eventKey: string;
	children: React.ReactNode;
}) {
	const active = useMatch(to);
	return (
		<Nav.Link
			as={NavLink}
			eventKey={eventKey} // callopseOnSelect wont fire unless eventKey is provided
			to={to}
			active={Boolean(active)}
		>
			{children}
		</Nav.Link>
	);
}

const appName = "Meetings";
export function Menu() {
	const { search } = useLocation();
	const { groupName } = useParams();

	const title = (groupName ? groupName + " " : "") + appName;
	if (document.title !== title) document.title = title;

	const menu = useMenuLinks();
	const menuItems = menu.map((item) => (
		<AppNavLink
			to={item.link + search}
			eventKey={item.link}
			key={item.link}
		>
			{item.label}
		</AppNavLink>
	));

	return (
		<Navbar
			collapseOnSelect
			expand="lg"
			style={{
				width: 275,
			}}
		>
			<Navbar.Brand as={NavLink} to="/">
				{title}
			</Navbar.Brand>
			<Navbar.Toggle aria-controls="basic-navbar-nav" />
			<Navbar.Collapse id="basic-navbar-nav">
				<Nav className="navbar-nav nav-underline me-auto">
					{menuItems}
				</Nav>
			</Navbar.Collapse>
		</Navbar>
	);
}

export default Menu;
