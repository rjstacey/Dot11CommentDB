import {
	useEffect,
	useRef,
	useState,
	useMemo,
	cloneElement,
	isValidElement,
	useCallback,
	Children,
} from "react";
import { Navbar, Nav, NavDropdown } from "react-bootstrap";
import { Breadcrumbs } from "./Breadcrumbs";
import clsx from "clsx";

import "./Menu.css";

export function Menu({ children }: { children?: React.ReactNode }) {
	const navRef = useRef<HTMLDivElement>(null);
	const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>(
		{},
	);

	const handleIntersection: IntersectionObserverCallback = useCallback(
		(entries) => {
			const update: Record<string, boolean> = {};
			entries.forEach((entry) => {
				if (entry.target instanceof HTMLElement) {
					const index = entry.target.dataset["index"];
					if (index) update[index] = entry.isIntersecting;
				}
			});
			setVisibilityMap((prev) => ({
				...prev,
				...update,
			}));
		},
		[],
	);

	useEffect(() => {
		const observer = new IntersectionObserver(handleIntersection, {
			root: navRef.current!,
			threshold: 1,
		});
		Array.from(navRef.current!.children).forEach((child) => {
			observer.observe(child);
		});
		return () => {
			observer.disconnect();
		};
	}, [handleIntersection, children]);

	const [mainMenu, overflowMenu] = useMemo(() => {
		const mainMenu: React.ReactElement[] = [];
		const overflowMenu: React.ReactElement[] = [];
		Children.forEach(children, (child, index) => {
			if (
				!isValidElement<{
					className?: string;
					"data-index": string;
				}>(child)
			) {
				return;
			}
			const overflow = !visibilityMap[index.toString()];
			const className = clsx(
				child.props.className,
				overflow && "overflow",
			);
			const el = cloneElement(child, {
				"data-index": index.toString(),
				className,
			});
			mainMenu.push(el);
			if (overflow) overflowMenu.push(el);
		});
		return [mainMenu, overflowMenu] as const;
	}, [children, visibilityMap]);

	return (
		<Navbar>
			<Breadcrumbs />
			<Nav variant="underline" ref={navRef} className="menu-main">
				{mainMenu}
			</Nav>
			{overflowMenu.length > 0 && (
				<NavDropdown
					title={<i className="bi-three-dots" />}
					id="overflow-menu-dropdown"
					align="end"
				>
					<Nav variant="underline">{overflowMenu}</Nav>
				</NavDropdown>
			)}
		</Navbar>
	);
}
