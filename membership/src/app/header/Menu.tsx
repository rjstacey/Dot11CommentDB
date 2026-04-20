import { useMemo } from "react";
import { NavLink, useParams } from "react-router";
import { Navbar, Nav, Breadcrumb } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectWorkingGroup, AccessLevel } from "@/store/groups";
import {
	selectImatAttendanceSummaryState,
	selectImatAttendanceSummarySession,
} from "@/store/imatAttendanceSummary";

type MenuItem = {
	link: string;
	label: string;
};

function useMenuLinks() {
	//const groupName = useParams().groupName || "";
	const group = useAppSelector(selectWorkingGroup);
	const session = useAppSelector(selectImatAttendanceSummarySession);
	const { useDaily } = useAppSelector(selectImatAttendanceSummaryState);
	let sessionAttendanceLink = "sessionAttendance";
	if (session?.number) {
		sessionAttendanceLink += `/${session.number}`;
		if (useDaily) sessionAttendanceLink += "?useDaily=true";
	}

	// Only display links for which the user has permissions
	// Replace params with the current setting
	return useMemo(() => {
		const menu: MenuItem[] = [];

		// No menu items if there is no group
		if (!group) return menu;

		// Groups link for "root" (/groups) or committee/working group ("/:groupName/groups")
		const groupsAccess = group.permissions.groups || AccessLevel.none;
		if (groupsAccess >= AccessLevel.ro) {
			menu.push({
				link: `/${group.name}/groups`,
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
				link: `/${group.name}/${sessionAttendanceLink}`,
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
			menu.push({
				link: `/${group.name}/membershipOverTime`,
				label: "Membership over time",
			});
			menu.push({
				link: `/${group.name}/reports`,
				label: "Reports",
			});
		}

		return menu;
	}, [group, session]);
}

const appName = "Membership";
export function Menu() {
	const { groupName } = useParams();

	const title = groupName ? `${groupName} | ${appName}` : appName;
	if (document.title !== title) document.title = title;

	const breadcrumbItems = [];
	breadcrumbItems.push(
		<Breadcrumb.Item key="home" href="/">
			<i className="bi-house" />
		</Breadcrumb.Item>,
	);
	breadcrumbItems.push(
		<Breadcrumb.Item key="app" linkAs={NavLink} linkProps={{ to: "/" }}>
			{appName}
		</Breadcrumb.Item>,
	);
	if (groupName) {
		breadcrumbItems.push(
			<Breadcrumb.Item
				key="group"
				linkAs={NavLink}
				linkProps={{ to: `/${groupName}` }}
			>
				{groupName}
			</Breadcrumb.Item>,
		);
	}

	const menu = useMenuLinks();
	const menuItems = menu.map((item) => (
		<Nav.Link as={NavLink} key={item.link} to={item.link}>
			{item.label}
		</Nav.Link>
	));

	return (
		<Navbar expand="xl" className="justify-content-between">
			<Breadcrumb className="d-flex align-items-center mb-0 me-2">
				{breadcrumbItems}
			</Breadcrumb>
			<Navbar.Toggle aria-controls="basic-navbar-nav" />
			<Navbar.Collapse id="basic-navbar-nav">
				<Nav variant="underline" className="me-auto">
					{menuItems}
				</Nav>
			</Navbar.Collapse>
		</Navbar>
	);
}
