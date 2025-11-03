import * as React from "react";
import { RouteObject } from "react-router";
import { indexLoader, sessionAttendanceLoader } from "./loader";
import SessionAttendanceLayout from "./layout";
import SessionNumberLayout from "./sessionNumberLayout";
import { Main } from "./main";
import imatRoute from "./imat/route";
import registrationRoute from "./registration/route";
import summaryRoute from "./summary/route";

export const sessionAttendanceRoute: RouteObject = {
	Component: SessionAttendanceLayout,
	children: [
		{
			index: true,
			loader: indexLoader,
			Component: Main,
		},
		{
			path: ":sessionNumber",
			loader: sessionAttendanceLoader,
			element: (
				<React.Suspense fallback={<Main>Loading...</Main>}>
					<SessionNumberLayout />
				</React.Suspense>
			),
			children: [
				{ index: true, element: <Main /> },
				{ path: "imat", ...imatRoute },
				{ path: "summary", ...summaryRoute },
				{ path: "registration", ...registrationRoute },
			],
		},
	],
};
