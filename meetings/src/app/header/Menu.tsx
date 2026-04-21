import React, {
	useEffect,
	useRef,
	useMemo,
	Children,
	isValidElement,
	cloneElement,
	useState,
} from "react";
import { Navbar, Nav, NavDropdown } from "react-bootstrap";
import clsx from "clsx";
import { Breadcrumbs } from "./Breadcrumbs";

import "./Menu.css";

export function Menu({ children }: { children?: React.ReactElement[] }) {
	const navRef = useRef<HTMLDivElement>(null);
	const [visMap, setVisMap] = useState<boolean[]>([]);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	useEffect(() => {
		function handleIntersection(entries: IntersectionObserverEntry[]) {
			entries.forEach((entry) => {
				const target = entry.target;
				if (target instanceof HTMLElement) {
					const index = Array.from(
						target.parentNode!.children,
					).indexOf(target);
					setVisMap((state) => {
						const newState = [...state];
						newState[index] = entry.isIntersecting;
						return newState;
					});
				}
			});
		}
		const root = navRef.current!;
		const children = Array.from(root.children);
		setVisMap(children.map(() => true));
		const observer = new IntersectionObserver(handleIntersection, {
			root,
			threshold: 1,
		});
		children.forEach((child) => {
			observer.observe(child);
		});
		return () => {
			observer.disconnect();
		};
	}, [children]);

	const items = useMemo(() => {
		const items: React.ReactElement[] = [];
		Children.forEach(children, (child, index) => {
			if (!isValidElement<{ className?: string }>(child)) {
				return;
			}
			const className = clsx(child.props.className, {
				["overflow"]: !visMap[index],
			});
			const el = cloneElement(child, { className });
			items.push(el);
		});
		return items;
	}, [children, visMap]);

	return (
		<Navbar className="menu-navbar">
			<Breadcrumbs />
			<Nav variant="underline" ref={navRef} className="menu-main-nav">
				{items}
			</Nav>
			<NavDropdown
				title={<i className="bi-three-dots" />}
				id="menu-overflow-dropdown"
				align="end"
				className="menu-overflow-dropdown"
				renderMenuOnMount
				show={dropdownOpen}
				onToggle={setDropdownOpen}
			>
				<Nav
					variant="underline"
					className="menu-overflow-nav"
					onClick={() => setDropdownOpen(false)}
				>
					{items}
				</Nav>
			</NavDropdown>
		</Navbar>
	);
}
