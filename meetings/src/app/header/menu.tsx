import * as React from "react";
import { NavLink, useParams, useLocation } from "react-router";
import { Navbar, Nav } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import { selectTopLevelGroupByName } from "@/store/groups";
import { selectBreakoutMeetingId } from "@/store/imatBreakouts";

import routes, { AppRoute } from "../routes";

type MenuPathItem = {
	path: string;
	label: string;
	minAccess?: number;
};

type MenuLinkItem = {
	link: string;
	label: string;
	minAccess?: number;
};

function useMenuPaths() {
	return React.useMemo(() => {
		const menu: MenuPathItem[] = [];
		function getMenuItem(path: string, route: AppRoute) {
			if (route.path) {
				if (route.path[0] === "/") {
					path = route.path;
				} else {
					path =
						path +
						(path[path.length - 1] === "/" ? "" : "/") +
						route.path;
				}
				if (route.menuLabel)
					menu.push({
						path,
						label: route.menuLabel,
						minAccess: route.minAccess,
					});
				if (route.children)
					route.children.forEach((route) => getMenuItem(path, route));
			}
		}
		routes.forEach((route) => getMenuItem("", route));
		return menu;
	}, []);
}

function useMenuLinks() {
	const groupName = useParams().groupName || "*";
	const group = useAppSelector((state) =>
		selectTopLevelGroupByName(state, groupName!)
	);
	const access = group?.permissions.meetings || AccessLevel.none;
	const imatBreakoutMeetingId = useAppSelector(selectBreakoutMeetingId);
	const menuPaths = useMenuPaths();

	const menu: MenuLinkItem[] = React.useMemo(() => {
		return menuPaths
			.filter((m) => access >= (m.minAccess || AccessLevel.none))
			.map((m) => {
				const link = m.path
					.replace(":groupName", groupName)
					.replace(
						"/:meetingNumber?",
						imatBreakoutMeetingId ? `/${imatBreakoutMeetingId}` : ""
					)
					.replace(/\/:[^/]+\?/, ""); // remove optional parameters
				return { ...m, link };
			});
	}, [menuPaths, access, groupName, imatBreakoutMeetingId]);

	return menu;
}

const appName = "Meetings";
export function Menu() {
	const location = useLocation();
	const { groupName } = useParams();

	const title = (groupName ? groupName + " " : "") + appName;
	if (document.title !== title) document.title = title;

	const menu = useMenuLinks();
	const menuItems = menu.map((item) => (
		<Nav.Link
			as={NavLink}
			key={item.link}
			eventKey={item.link} // callopseOnSelect wont fire unless eventKey is provided
			to={item.link + location.search}
		>
			{item.label}
		</Nav.Link>
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
				<Nav variant="underline" className="me-auto">
					{menuItems}
				</Nav>
			</Navbar.Collapse>
		</Navbar>
	);
}

export default Menu;
