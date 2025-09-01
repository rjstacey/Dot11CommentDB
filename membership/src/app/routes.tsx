import { RouteObject, Outlet } from "react-router";
import { Placeholder } from "react-bootstrap";
import { AppLayout } from "./layout";
import { AppErrorPage } from "./errorPage";
import Fallback from "./fallback";
import RootMain from "./root";
import { rootLoader } from "./rootLoader";
import { groupLoader } from "./groupLoader";
import { groupsRoute } from "./groups/route";
import { membersRoute } from "./members/route";
import { sessionParticipationRoute } from "./sessionParticipation/route";
import { ballotParticipationRoute } from "./ballotParticipation/route";
import { sessionAttendanceRoute } from "./sessionAttendance/route";
import { notificationRoute } from "./notification/route";
import { affiliationMapRoute } from "./affiliationMap/route";
import { reportsRoute } from "./reports/route";

export const routes: RouteObject[] = [
	{
		path: "/",
		loader: rootLoader,
		element: <AppLayout />,
		errorElement: <AppErrorPage />,
		hydrateFallbackElement: <Fallback />,
		children: [
			{ index: true, element: <RootMain /> },
			{ path: "groups", ...groupsRoute },
			{
				path: ":groupName",
				loader: groupLoader,
				element: <Outlet />,
				hydrateFallbackElement: (
					<Placeholder className="w-100 h-100" animation="wave" />
				),
				children: [
					{ path: "groups", ...groupsRoute },
					{ path: "members", ...membersRoute },
					{
						path: "sessionParticipation",
						...sessionParticipationRoute,
					},
					{
						path: "ballotParticipation",
						...ballotParticipationRoute,
					},
					{ path: "sessionAttendance", ...sessionAttendanceRoute },
					{ path: "notification", ...notificationRoute },
					{ path: "affiliationMap", ...affiliationMapRoute },
					{ path: "reports", ...reportsRoute },
				],
			},
		],
	},
];
