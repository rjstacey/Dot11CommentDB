import type { RouteObject } from "react-router";

import { ImatAttendanceLayout } from "./layout";
import { ImatMeetingAttendance } from "./ImatMeetingAttendance";
import { ImatBreakoutAttendance } from "./ImatBreakoutAttendance";
import {
	imatAttendanceLoader,
	imatMeetingAttendanceLoader,
	imatBreakoutAttendanceLoader,
} from "./loader";

const route: RouteObject = {
	element: <ImatAttendanceLayout />,
	loader: imatAttendanceLoader,
	children: [
		{
			index: true,
			element: null,
		},
		{
			path: ":meetingNumber",
			children: [
				{
					index: true,
					element: <ImatMeetingAttendance />,
					loader: imatMeetingAttendanceLoader,
				},
				{
					path: ":breakoutNumber",
					element: <ImatBreakoutAttendance />,
					loader: imatBreakoutAttendanceLoader,
				},
			],
		},
	],
};

export default route;
