import { useMemo } from "react";
import { NavLink, matchPath } from "react-router";
import { useMenu } from "./useMenu";
import { clsx } from "clsx";

export function useMenuItems() {
	const menu = useMenu();

	return useMemo(
		() =>
			menu.map((item, i) => (
				<NavLink
					key={i}
					to={item.to}
					className={clsx(
						"nav-link",
						matchPath(item.to.pathname, window.location.pathname) &&
							"active",
					)}
				>
					{item.label}
				</NavLink>
			)),
		[menu],
	);
}
