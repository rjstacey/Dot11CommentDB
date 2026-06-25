import { NavLink, useParams } from "react-router";
import { Breadcrumb } from "react-bootstrap";

const appName = "Membership";

export function Breadcrumbs() {
	const { groupName } = useParams();
	const title = groupName ? `${groupName} | ${appName}` : appName;
	if (document.title !== title) document.title = title;

	return (
		<Breadcrumb>
			<Breadcrumb.Item
				href={"/home" + (groupName ? `/${groupName}` : "")}
			>
				<i className="bi bi-house" />
			</Breadcrumb.Item>
			<Breadcrumb.Item linkAs={NavLink} linkProps={{ to: "/" }}>
				{appName}
			</Breadcrumb.Item>
			{groupName && (
				<Breadcrumb.Item
					linkAs={NavLink}
					linkProps={{ to: `/${groupName}` }}
				>
					{groupName}
				</Breadcrumb.Item>
			)}
			<Breadcrumb.Item />
		</Breadcrumb>
	);
}
