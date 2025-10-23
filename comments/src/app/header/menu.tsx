import * as React from "react";
import { NavLink, useParams, useMatch } from "react-router";
import { Navbar, Nav } from "react-bootstrap";
import { AccessLevel } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectTopLevelGroupByName } from "@/store/groups";
import { selectCurrentBallotID } from "@/store/ballots";
import { selectCommentsSearch } from "@/store/comments";

type MenuPath = { pathname: string; search?: string };
type MenuItem = {
	to: MenuPath;
	label: string;
};

function useMenuLinks() {
	const { groupName } = useParams();
	const group = useAppSelector((state) =>
		groupName ? selectTopLevelGroupByName(state, groupName) : undefined
	);
	let ballotId = useAppSelector(selectCurrentBallotID);
	if (ballotId) ballotId = encodeURIComponent(ballotId);
	const commentsSearch = useAppSelector(selectCommentsSearch);

	// Only display links for which the user has permissions
	// Replace params with the current setting
	return React.useMemo(() => {
		const menu: MenuItem[] = [];

		// No menu items if there is no group
		if (!group) return menu;

		const ballotsAccess = group.permissions.ballots || AccessLevel.none;
		const resultsAccess = group.permissions.results || AccessLevel.none;
		const commentsAccess = group.permissions.comments || AccessLevel.none;

		let pathname: string;

		if (ballotsAccess >= AccessLevel.admin) {
			pathname = `/${group.name}/ballots`;
			menu.push({
				to: { pathname },
				label: "Ballots",
			});
			pathname = `/${group.name}/voters`;
			if (ballotId) pathname += `/${ballotId}`;
			menu.push({
				to: { pathname },
				label: "Voters",
			});
		}

		if (resultsAccess >= AccessLevel.ro) {
			pathname = `/${group.name}/results`;
			if (ballotId) pathname += `/${ballotId}`;
			menu.push({
				to: { pathname },
				label: "Results",
			});
		}

		if (commentsAccess >= AccessLevel.ro) {
			pathname = `/${group.name}/comments`;
			let search: string | undefined;
			if (ballotId) {
				pathname += `/${ballotId}`;
				if (commentsSearch) search = "?" + commentsSearch.toString();
			}
			menu.push({
				to: { pathname, search },
				label: "Comments",
			});

			pathname = `/${group.name}/reports`;
			if (ballotId) pathname += `/${ballotId}`;
			menu.push({
				to: { pathname },
				label: "Reports",
			});
		}

		return menu;
	}, [group, ballotId, commentsSearch]);
}

function AppNavLink({
	to,
	eventKey,
	children,
}: {
	to: MenuPath;
	eventKey?: string;
	children?: React.ReactNode;
}) {
	const active = useMatch(to.pathname);
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
	to: MenuPath;
	children?: React.ReactNode;
}) {
	const active = useMatch(to.pathname);
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
	const menuItems = menu.map((item, i) => (
		<AppNavLink key={i} to={item.to} eventKey={i.toString()}>
			{item.label}
		</AppNavLink>
	));

	const activeMenuItem = menu.map((item, i) => (
		<AppNavLinkActive key={i} to={item.to}>
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
