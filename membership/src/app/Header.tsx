import React from "react";
import { NavLink, useLocation } from "react-router-dom";

import { Account, Dropdown, Button } from "dot11-components";

import "./header.css";

import { resetStore } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectWorkingGroupName } from "../store/groups";
import {
	selectUser,
	selectUserMembersAccess,
	AccessLevel,
} from "../store/user";

import { PathWorkingGroupSelector } from "./PathWorkingGroupSelector";

type MenuItem = {
	minAccess: number;
	link: string;
	label: string;
	groupName: "none" | "required" | "optional";
};

const fullMenu: MenuItem[] = [
	{
		minAccess: AccessLevel.admin,
		link: "/members",
		groupName: "required",
		label: "Members",
	},
	{
		minAccess: AccessLevel.admin,
		link: "/groups",
		groupName: "optional",
		label: "Groups",
	},
	{
		minAccess: AccessLevel.admin,
		link: "/sessionParticipation",
		groupName: "required",
		label: "Session participation",
	},
	{
		minAccess: AccessLevel.admin,
		link: "/ballotParticipation",
		groupName: "required",
		label: "Ballot participation",
	},
	{
		minAccess: AccessLevel.admin,
		link: "/sessionAttendance",
		groupName: "required",
		label: "Session attendance",
	},
	{
		minAccess: AccessLevel.admin,
		link: "/notification",
		groupName: "required",
		label: "Notify",
	},
	{
		minAccess: AccessLevel.admin,
		link: "/reports",
		groupName: "required",
		label: "Reports",
	},
];

const NavItem = (
	props: React.ComponentProps<typeof NavLink> & { isActive?: boolean }
) => (
	<NavLink
		className={"nav-link" + (props.isActive ? " active" : "")}
		{...props}
	/>
);

function NavMenu({
	className,
	methods,
}: {
	className?: string;
	methods?: { close: () => void };
}) {
	const access = useAppSelector(selectUserMembersAccess);
	const groupName = useAppSelector(selectWorkingGroupName);

	let classNames = "nav-menu";
	if (className) classNames += " " + className;

	const menu = fullMenu
		.filter((m) => access >= m.minAccess)
		.filter((m) => m.groupName !== "required" || groupName)
		.map((m) => {
			if (
				(m.groupName === "required" || m.groupName === "optional") &&
				groupName
			)
				return {
					...m,
					link:
						m.link + (m.link.endsWith("/") ? "" : "/") + groupName,
				};
			else return m;
		});

	return (
		<nav
			className={classNames}
			onClick={methods ? methods.close : undefined} // If a click bubbles up, close the dropdown
		>
			{menu.map((m) => (
				<NavItem key={m.link} to={m.link}>
					{m.label}
				</NavItem>
			))}
		</nav>
	);
}

const smallScreenQuery = window.matchMedia("(max-width: 992px");

function Header() {
	const dispatch = useAppDispatch();

	const user = useAppSelector(selectUser)!;
	const [isSmall, setIsSmall] = React.useState(smallScreenQuery.matches);

	React.useEffect(() => {
		const updateSmallScreen = (e: MediaQueryListEvent) =>
			setIsSmall(e.matches);
		smallScreenQuery.addEventListener("change", updateSmallScreen);
		return () =>
			smallScreenQuery.removeEventListener("change", updateSmallScreen);
	}, []);

	const location = useLocation();
	const menuItem = fullMenu.find(
		(m) => location.pathname.search(m.link) >= 0
	);

	return (
		<header className="header">
			<PathWorkingGroupSelector />

			{isSmall && (
				<Dropdown
					selectRenderer={({ state, methods }) => (
						<div
							className="nav-menu-icon"
							onClick={
								state.isOpen ? methods.close : methods.open
							}
						/>
					)}
					dropdownRenderer={(props) => (
						<NavMenu className="nav-menu-vertical" {...props} />
					)}
					dropdownAlign="left"
				/>
			)}
			<div className="nav-menu-container">
				{isSmall ? (
					<label className="nav-link active">
						{menuItem ? menuItem.label : ""}
					</label>
				) : (
					<NavMenu className="nav-menu-horizontal" />
				)}
			</div>
			<Account user={user}>
				<Button onClick={() => dispatch(resetStore())}>
					Clear cache
				</Button>
			</Account>
		</header>
	);
}

export default Header;
