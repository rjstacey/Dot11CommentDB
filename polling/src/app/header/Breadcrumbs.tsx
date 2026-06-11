import { NavLink, useParams } from "react-router";
import { Breadcrumb } from "react-bootstrap";

const appName = "Polling";

export function Breadcrumbs() {
	const { groupName } = useParams();
	const title = groupName ? `${groupName} | ${appName}` : appName;
	if (document.title !== title) document.title = title;

	return (
		<Breadcrumb>
			<Breadcrumb.Item linkAs={NavLink} linkProps={{ to: "/" }}>
				{appName}
			</Breadcrumb.Item>
			<Breadcrumb.Item />
		</Breadcrumb>
	);
}
