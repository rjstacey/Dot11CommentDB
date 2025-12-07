import { Tabs, Tab } from "react-bootstrap";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
	setUiProperties,
	selectUiProperties,
} from "@/store/imatAttendanceSummary";
import type { MemberChange, MemberCreate } from "@/store/members";
import { SessionAttendanceSummaryChange } from "@/store/attendanceSummaries";

import { MemberBasicEdit } from "../../members/detail/MemberBasicEdit";
import { MemberStatusEdit } from "../../members/detail/MemberStatusEdit";
import { MemberContactEdit } from "../../members/detail/MemberContactEdit";
import { AttendanceInfoEdit } from "./AttendanceInfoEdit";
import type {
	EditAction,
	MultipleMember,
	MultipleSessionAttendanceSummary,
} from "@/edit/sessionAttendanceEdit";

export function AttendanceTabs({
	sapin,
	editedMember,
	savedMember,
	memberOnChange,
	editedAttendance,
	savedAttendance,
	attendanceOnChange,
	readOnly,
}: {
	action: EditAction;
	sapin: number;
	editedMember: MultipleMember | MemberCreate;
	savedMember?: MultipleMember;
	memberOnChange: (changes: MemberChange) => void;
	editedAttendance: MultipleSessionAttendanceSummary;
	savedAttendance: MultipleSessionAttendanceSummary;
	attendanceOnChange: (changes: SessionAttendanceSummaryChange) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();

	let tabKey: string = useAppSelector(selectUiProperties).tabKey;
	if (!["basic", "contact", "status", "attendance"].includes(tabKey)) {
		tabKey = "basic";
	}

	const setTabKey = (tabKey: string | null) => {
		dispatch(setUiProperties({ tabKey }));
	};

	return (
		<Tabs onSelect={setTabKey} activeKey={tabKey} fill>
			<Tab eventKey="basic" title="Basic" className="p-3">
				<MemberBasicEdit
					sapins={[sapin]}
					edited={editedMember}
					saved={savedMember}
					onChange={memberOnChange}
					readOnly={readOnly}
				/>
			</Tab>
			<Tab eventKey="contact" title="Contact" className="p-3">
				<MemberContactEdit
					edited={editedMember}
					saved={savedMember}
					onChange={memberOnChange}
				/>
			</Tab>
			<Tab eventKey="status" title="Status" className="p-3">
				<MemberStatusEdit
					edited={editedMember}
					saved={savedMember}
					onChange={memberOnChange}
				/>
			</Tab>
			<Tab eventKey="attendance" title="Attendance" className="p-3">
				<AttendanceInfoEdit
					edited={editedAttendance}
					saved={savedAttendance}
					onChange={attendanceOnChange}
				/>
			</Tab>
		</Tabs>
	);
}
