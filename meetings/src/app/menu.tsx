import React from "react";
import { matchPath, NavLink, useLocation, useParams } from "react-router-dom";

import { Dropdown, DropdownRendererProps } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import { selectWorkingGroupByName } from "../store/groups";
import { selectBreakoutMeetingId } from "../store/imatBreakouts";

import routes, { AppRoute } from "./routes";

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
		selectWorkingGroupByName(state, groupName!)
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

export function NavMenu({
	className,
	methods,
}: {
	className?: string;
	methods?: DropdownRendererProps["methods"];
}) {
	const location = useLocation();
	const menu = useMenuLinks();

	let classNames: string = "nav-menu";
	if (className) classNames += " " + className;

	return (
		<nav
			className={classNames}
			onClick={methods?.close} // If a click bubbles up, close the dropdown
		>
			{menu.map((m) => (
				<NavLink
					className="nav-link"
					key={m.link}
					to={m.link + location.search}
				>
					{m.label}
				</NavLink>
			))}
		</nav>
	);
}

export function SmallNavMenu() {
	const { pathname } = useLocation();
	const menu = useMenuPaths();
	const menuItem = menu.find((m) => matchPath(m.path, pathname));

	return (
		<>
			<i className="bi-list" />
			<div className="nav-link active">{menuItem?.label}</div>
		</>
	);
}

const smallScreenQuery = window.matchMedia("(max-width: 992px");

function Nav() {
	const [isSmall, setIsSmall] = React.useState(smallScreenQuery.matches);

	React.useEffect(() => {
		const updateSmallScreen = (e: MediaQueryListEvent) =>
			setIsSmall(e.matches);
		smallScreenQuery.addEventListener("change", updateSmallScreen);
		return () =>
			smallScreenQuery.removeEventListener("change", updateSmallScreen);
	}, []);

	return (
		<div className="nav-menu-container">
			{isSmall ? (
				<Dropdown
					className="nav-small-menu"
					selectRenderer={(props) => <SmallNavMenu />}
					dropdownRenderer={(props) => (
						<NavMenu
							className="nav-menu-vertical"
							methods={props.methods}
						/>
					)}
					dropdownAlign="left"
				/>
			) : (
				<NavMenu className="nav-menu-horizontal" />
			)}
		</div>
	);
}

export default Nav;
