import * as React from "react";
import { NavLink, useParams } from "react-router";
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
	const ballotId = useAppSelector(selectCurrentBallotID);

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

const appName = "Comments";
export function Menu() {
	const { groupName } = useParams();

	const title = (groupName ? groupName + " " : "") + appName;
	if (document.title !== title) document.title = title;

	const menu = useMenuLinks();
	const menuItems = menu.map((item) => (
		<Nav.Link as={NavLink} key={item.link} to={item.link}>
			{item.label}
		</Nav.Link>
	));

	return (
		<Navbar
			expand="lg"
			className="w-50"
			style={{
				//flex: "1 0 50%",
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
		</Navbar>
	);
}

export default Menu;
