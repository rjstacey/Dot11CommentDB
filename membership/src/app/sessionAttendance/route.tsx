import * as React from "react";
import { RouteObject, Outlet } from "react-router";
import { indexLoader, sessionAttendanceLoader } from "./loader";
import SessionAttendanceLayout from "./layout";
import { Main } from "./main";

const SessionAttendanceTable = React.lazy(() => import("./table"));
const SessionRegistrationTable = React.lazy(() => import("./registration"));

export const sessionAttendanceRoute: RouteObject = {
	Component: SessionAttendanceLayout,
	children: [
		{
			index: true,
			loader: indexLoader,
			element: <Main />,
		},
		{
			path: ":sessionNumber",
			loader: sessionAttendanceLoader,
			element: (
				<React.Suspense fallback={<Main>Loading...</Main>}>
					<Outlet />
				</React.Suspense>
			),
			children: [
				{ index: true, element: <SessionAttendanceTable /> },
				{ path: "registration", element: <SessionRegistrationTable /> },
			],
		},
	],
};
