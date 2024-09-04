import React from "react";
import { matchPath, NavLink, useLocation, useParams } from "react-router-dom";

import { Dropdown, DropdownRendererProps } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import { selectWorkingGroupByName } from "../store/groups";
import { selectCurrentBallotID } from "../store/ballots";

import { menu } from "./routes";

type MenuLinkItem = {
	link: string;
	label: string;
	scope?: string;
	minAccess?: number;
};

function useMenuLinks() {
	const groupName = useParams().groupName || "";
	const group = useAppSelector((state) =>
		selectWorkingGroupByName(state, groupName)
	);
	const ballotId = useAppSelector(selectCurrentBallotID);

	const menuLinks: MenuLinkItem[] = React.useMemo(() => {
		return menu
			.filter((m) => {
				const access = group?.permissions[m.scope!] || AccessLevel.none;
				return access >= (m.minAccess || AccessLevel.none);
			})
			.map((m) => {
				const link = m.path
					.replace(":groupName", groupName)
					.replace("/:ballotId?", ballotId ? `/${ballotId}` : "")
					.replace(/\/:[^/]+\?/, ""); // remove optional parameters
				return { ...m, link };
			});
	}, [group, groupName, ballotId]);

	return menuLinks;
}

function Menu({
	className,
	methods,
}: {
	className?: string;
	methods?: DropdownRendererProps["methods"];
}) {
	const menu = useMenuLinks();

	let classNames: string = "nav-menu";
	if (className) classNames += " " + className;

	return (
		<nav
			className={classNames}
			onClick={methods?.close} // If a click bubbles up, close the dropdown
		>
			{menu.map((m) => (
				<NavLink className="nav-link" key={m.link} to={m.link}>
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
