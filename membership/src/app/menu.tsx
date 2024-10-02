import React from "react";
import { matchPath, NavLink, useLocation, useParams } from "react-router-dom";

import { Dropdown, DropdownRendererProps } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import { selectTopLevelGroupByName } from "../store/groups";

import { selectSessionAttendeesSessionNumber } from "../store/sessionAttendees";

type MenuItem = {
	link: string;
	label: string;
};

function useMenuLinks() {
	const groupName = useParams().groupName || "";
	const group = useAppSelector((state) =>
		selectTopLevelGroupByName(state, groupName)
	);
	const sessionNumber = useAppSelector(selectSessionAttendeesSessionNumber);

	// Only display links for which the use has permissions
	// Replace params with the current setting
	return React.useMemo(() => {
		const menu: MenuItem[] = [];

		// No menu items if there is no group
		if (!group) return menu;

		// Groups link for "root" (/groups) or committee/working group ("/:groupName/groups")
		let groupsAccess = group.permissions.groups || AccessLevel.none;
		if (groupsAccess >= AccessLevel.ro) {
			menu.push({
				link: (group.type === "r" ? "/" : `/${group.name}`) + "/groups",
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
					(sessionNumber ? `/${sessionNumber}` : ""),
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
		}

		return menu;
	}, [group, sessionNumber]);
}

function Menu({
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
					to={m.link}
					state={location.state}
				>
					{m.label}
				</NavLink>
			))}
		</nav>
	);
}

function CurrentMenuItem() {
	const { pathname } = useLocation();
	const menu = useMenuLinks();
	const menuItem = menu.find((m) => m.link === pathname);

	return (
		<>
			<i className="bi-list" />
			<div className="nav-link active">{menuItem?.label || "??"}</div>
		</>
	);
}

const smallScreenQuery = window.matchMedia("(max-width: 992px");

function NavMenu() {
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
					selectRenderer={(props) => <CurrentMenuItem />}
					dropdownRenderer={(props) => (
						<Menu
							className="nav-menu-vertical"
							methods={props.methods}
						/>
					)}
					dropdownAlign="left"
				/>
			) : (
				<Menu className="nav-menu-horizontal" />
			)}
		</div>
	);
}

export default NavMenu;
