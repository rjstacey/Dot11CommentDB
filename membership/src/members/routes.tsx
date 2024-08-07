import MembersLayout from "./layout";
import MembersTable from "./table";
import MembersChart from "./chart";

const route = {
	element: <MembersLayout />,
	children: [
		{
			index: true,
			element: <MembersTable />,
		},
		{
			path: "chart",
			element: <MembersChart />,
		},
	],
};

export default route;
