import { NavLink, useParams } from "react-router";
import { Breadcrumb } from "react-bootstrap";

const appName = "Meetings";

export function Breadcrumbs() {
	const { groupName } = useParams();
	const title = groupName ? `${groupName} | ${appName}` : appName;
	if (document.title !== title) document.title = title;

	return (
		<Breadcrumb>
			<Breadcrumb.Item linkAs={NavLink} linkProps={{ to: "/" }}>
				{appName}
			</Breadcrumb.Item>
			{groupName && (
				<Breadcrumb.Item
					key="group"
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
