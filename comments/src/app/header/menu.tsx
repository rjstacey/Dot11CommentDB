import * as React from "react";
import { NavLink, useParams, useMatch } from "react-router";
import { Navbar, Nav } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import { selectTopLevelGroupByName } from "@/store/groups";
import { selectCurrentBallotID } from "@/store/ballots";

type MenuItem = {
	link: string;
	label: string;
};

function useMenuLinks() {
	const { groupName } = useParams();
	const group = useAppSelector((state) =>
		groupName ? selectTopLevelGroupByName(state, groupName) : undefined
	);
	let ballotId = useAppSelector(selectCurrentBallotID);
	if (ballotId) ballotId = encodeURIComponent(ballotId);

	// Only display links for which the user has permissions
	// Replace params with the current setting
	return React.useMemo(() => {
		const menu: MenuItem[] = [];

		// No menu items if there is no group
		if (!group) return menu;

		const ballotsAccess = group.permissions.ballots || AccessLevel.none;
		const resultsAccess = group.permissions.results || AccessLevel.none;
		const commentsAccess = group.permissions.comments || AccessLevel.none;

		if (ballotsAccess >= AccessLevel.admin) {
			menu.push({
				link: `/${group.name}/ballots`,
				label: "Ballots",
			});
			menu.push({
				link:
					`/${group.name}/voters` + (ballotId ? `/${ballotId}` : ""),
				label: "Voters",
			});
		}

		if (resultsAccess >= AccessLevel.ro) {
			menu.push({
				link:
					`/${group.name}/results` + (ballotId ? `/${ballotId}` : ""),
				label: "Results",
			});
		}

		if (commentsAccess >= AccessLevel.ro) {
			menu.push({
				link:
					`/${group.name}/comments` +
					(ballotId ? `/${ballotId}` : ""),
				label: "Comments",
			});
			menu.push({
				link:
					`/${group.name}/reports` + (ballotId ? `/${ballotId}` : ""),
				label: "Reports",
			});
		}

		return menu;
	}, [group, ballotId]);
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
	.navbar-active-item {
		display: block;
	}
	@media (min-width: 992px) {
		.navbar-active-item {
			display: none;
		}
	}
`;

const appName = "Comments";
export function Menu() {
	const { groupName } = useParams();

	const title = (groupName ? groupName + " " : "") + appName;
	if (document.title !== title) document.title = title;

	const menu = useMenuLinks();
	const menuItems = menu.map((item) => (
		<AppNavLink key={item.link} to={item.link} eventKey={item.link}>
			{item.label}
		</AppNavLink>
	));

	const activeMenuItem = menu.map((item) => (
		<AppNavLinkActive key={item.link} to={item.link}>
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
					maxWidth: 275,
				}}
			>
				<Navbar.Brand as={NavLink} to="/">
					{title}
				</Navbar.Brand>
				<Navbar.Toggle aria-controls="basic-navbar-nav" />
				<Navbar.Collapse id="basic-navbar-nav">
					<Nav variant="underline" className="me-auto">
						{menuItems}
					</Nav>
				</Navbar.Collapse>
				<div className="navbar-active-item w-100">{activeMenuItem}</div>
			</Navbar>
		</>
	);
}

export default Menu;
