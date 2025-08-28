import { RouteObject, Outlet } from "react-router";
import { AppLayout } from "./layout";
import { AppErrorPage } from "./errorPage";
import RootMain from "./root";
import { rootLoader, groupLoader } from "./loader";
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
		element: <AppLayout />,
		errorElement: <AppErrorPage />,
		hydrateFallbackElement: <span>Fallback</span>,
		loader: rootLoader,
		children: [
			{ index: true, element: <RootMain /> },
			{ path: "groups", ...groupsRoute },
			{
				path: ":groupName",
				loader: groupLoader,
				element: <Outlet />,
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
