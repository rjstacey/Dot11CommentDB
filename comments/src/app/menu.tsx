import React from "react";
import { matchPath, NavLink, useLocation, useParams } from "react-router";

import { Dropdown, DropdownRendererProps } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import { selectTopLevelGroupByName } from "@/store/groups";

import { menu, MenuItem } from "./routes";
import { selectCurrentBallotID } from "@/store/ballots";

type MenuLinkItem = MenuItem & {
	link: string;
};

function useMenuLinks() {
	const { groupName } = useParams();
	const ballotId = useAppSelector(selectCurrentBallotID);
	const group = useAppSelector((state) =>
		groupName ? selectTopLevelGroupByName(state, groupName) : undefined
	);

	// Only display links for which the use has permissions
	// Replace params with the current setting
	const menuLinks: MenuLinkItem[] = React.useMemo(() => {
		return menu
			.filter((m) => {
				const access = group?.permissions[m.scope!] || AccessLevel.none;
				return access >= (m.minAccess || AccessLevel.none);
			})
			.map((m) => {
				const link = m.path
					.replace(/:groupName/, groupName ? groupName : "")
					.replace(/:ballotId\?{0,1}/, ballotId ? ballotId : "");
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
					selectRenderer={() => <CurrentMenuItem />}
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
