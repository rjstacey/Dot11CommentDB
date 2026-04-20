import { NavLink, useParams } from "react-router";
import { Breadcrumb } from "react-bootstrap";

const appName = "Comments";

export function Breadcrumbs() {
	const { groupName } = useParams();
	const title = groupName ? `${groupName} | ${appName}` : appName;
	if (document.title !== title) document.title = title;

	const breadcrumbItems = [];

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
	breadcrumbItems.push(<Breadcrumb.Item key="active" />);

	return <Breadcrumb>{breadcrumbItems}</Breadcrumb>;
}
