import * as React from "react";
import {
	matchPath,
	NavLink,
	useLocation,
	useNavigate,
	useParams,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";

import {
	Dropdown,
	Account,
	Button,
	DropdownRendererProps,
} from "dot11-components";

import { resetStore } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { AccessLevel, setUser, selectUser } from "../store/user";
import { GroupType, selectWorkingGroupByName } from "../store/groups";

import routes, { AppRoute } from "./routes";

import pkg from "../../package.json";

import styles from "./app.module.css";

type MenuPathItem = {
	path: string;
	label: string;
	minAccess?: number;
	groupTypes: GroupType[];
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
						groupTypes: route.groupTypes || [],
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
	const menuPaths = useMenuPaths();

	const menu: MenuLinkItem[] = React.useMemo(() => {
		if (!group)
			return [];
		const access = group.permissions.meetings || AccessLevel.none;
		return menuPaths
			.filter((m) => access >= (m.minAccess || AccessLevel.none) && m.groupTypes.includes(group.type!))
			.map((m) => {
				const link = m.path
					.replace(":groupName", group.name)
					.replace(/\/:[^/]+\?/, ""); // remove optional parameters
				return { ...m, link };
			});
	}, [menuPaths, group]);

	return menu;
}

function NavMenu({
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

function SmallNavMenu() {
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

function Header() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { groupName } = useParams();
	const user = useAppSelector(selectUser)!;
	const [isSmall, setIsSmall] = React.useState(smallScreenQuery.matches);

	React.useEffect(() => {
		const updateSmallScreen = (e: MediaQueryListEvent) =>
			setIsSmall(e.matches);
		smallScreenQuery.addEventListener("change", updateSmallScreen);
		return () =>
			smallScreenQuery.removeEventListener("change", updateSmallScreen);
	}, []);

	const title = (groupName ? groupName + " " : "") + "Membership";
	const rootPath = "/" + (groupName || "");

	const clearCache = () => {
		dispatch(resetStore());
		dispatch(setUser(user));
	};

	return (
		<header className={styles.header}>
			<Helmet title={title} />

			<h3 className="title" onClick={() => navigate(rootPath)}>
				{title}
			</h3>

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

			<Account user={user}>
				<div>
					{pkg.name}: {pkg.version}
				</div>
				<Button onClick={clearCache}>Clear cache</Button>
			</Account>
		</header>
	);
}

export default Header;
