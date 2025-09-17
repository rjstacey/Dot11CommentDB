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

	return React.useMemo(() => {
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
}

function AppNavLink({
	to,
	eventKey,
	children,
}: {
	to: string;
	eventKey?: string;
	children?: React.ReactNode;
}) {
	const active = useMatch(to);
	return (
		<Nav.Link
			as={NavLink}
			eventKey={eventKey} // collapseOnSelect wont fire unless eventKey is provided
			to={to}
			active={Boolean(active)}
		>
			{children}
		</Nav.Link>
	);
}

function AppNavLinkActive({
	to,
	children,
}: {
	to: string;
	children?: React.ReactNode;
}) {
	const active = useMatch(to);
	if (!active) return null;
	return (
		<Nav.Link as={NavLink} to={to}>
			{children}
		</Nav.Link>
	);
}

const style = `
	@media (max-width: 992px) {
		.nabar-expand-lg .navbar-active-item {
			display: none;
		}
	}
	.navbar-active-item {
		display: block;
	}
`;

const appName = "Meetings";
export function Menu() {
	const { search } = useLocation();
	const { groupName } = useParams();

	const title = (groupName ? groupName + " " : "") + appName;
	if (document.title !== title) document.title = title;

	const menu = useMenuLinks();
	const menuItems = menu.map((item) => (
		<AppNavLink
			key={item.link}
			to={item.link + search}
			eventKey={item.link}
		>
			{item.label}
		</AppNavLink>
	));

	const activeMenuItem = menu.map((item) => (
		<AppNavLinkActive key={item.link} to={item.link + search}>
			{item.label}
		</AppNavLinkActive>
	));

	return (
		<>
			<style>{style}</style>
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
				<Navbar.Toggle aria-controls="main-nav" />
				<Navbar.Collapse id="main-nav">
					<Nav variant="underline">{menuItems}</Nav>
				</Navbar.Collapse>

				<div className="navbar-active-item w-100">{activeMenuItem}</div>
			</Navbar>
		</>
	);
}

export default Menu;
