import React from "react";
import { matchPath, NavLink, useLocation, useParams } from "react-router-dom";

import { Dropdown, DropdownRendererProps } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import { selectTopLevelGroupByName } from "../store/groups";

import { selectSessionAttendeesSessionNumber } from "../store/sessionAttendees";

export type MenuItem = {
	path: string;
	label: string;
	membersMinAccess?: number;
	groupsMinAccess?: number;
};

export const menu: MenuItem[] = [
	{
		path: "/:groupName?/groups",
		label: "Groups",
		groupsMinAccess: AccessLevel.ro,
	},
	{
		path: "/:groupName/members",
		label: "Members",
		membersMinAccess: AccessLevel.ro,
	},
	{
		path: "/:groupName/sessionParticipation",
		label: "Session participation",
		membersMinAccess: AccessLevel.admin,
	},
	{
		path: "/:groupName/ballotParticipation",
		label: "Ballot pariticipation",
		membersMinAccess: AccessLevel.admin,
	},
	{
		path: "/:groupName/sessionAttendance/:sessionNumber?",
		label: "Session attendance",
		membersMinAccess: AccessLevel.admin,
	},
	{
		path: "/:groupName/notification",
		label: "Notification",
		membersMinAccess: AccessLevel.admin,
	},
	{
		path: "/:groupName/affiliationMap",
		label: "Affiliation Map",
		membersMinAccess: AccessLevel.ro,
	},
];

type MenuLinkItem = MenuItem & {
	link: string;
};

function useMenuLinks() {
	const groupName = useParams().groupName || "";
	const group = useAppSelector((state) =>
		selectTopLevelGroupByName(state, groupName)
	);
	const sessionNumber = useAppSelector(selectSessionAttendeesSessionNumber);
	console.log(`groupName="${groupName}"`, group);

	// Only display links for which the use has permissions
	// Replace params with the current setting
	const menuLinks: MenuLinkItem[] = React.useMemo(() => {
		return menu
			.filter((m) => {
				// No items if there is no group
				if (!group) return false;
				// Filter paths that require groupName
				if (/:groupName(?!\?)/.test(m.path) && !groupName) return false;
				let access = group.permissions.members || AccessLevel.none;
				if (
					m.membersMinAccess !== undefined &&
					access < m.membersMinAccess
				)
					return false;
				access = group.permissions.groups || AccessLevel.none;
				if (
					m.groupsMinAccess !== undefined &&
					access < m.groupsMinAccess
				)
					return false;
				return true;
			})
			.map((m) => {
				const link = m.path
					.replace(/:groupName\?{0,1}/, groupName)
					.replace(
						/:sessionNumber\?{0,1}/,
						sessionNumber ? sessionNumber.toString() : ""
					)
					.replace("//", "/");
				return { ...m, link };
			});
	}, [group, groupName, sessionNumber]);
	console.log(menuLinks);

	return menuLinks;
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
	const menuItem = menu.find((m) => matchPath(m.path, pathname));

	return (
		<>
			<i className="bi-list" />
			<div className="nav-link active">{menuItem?.label}</div>
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
