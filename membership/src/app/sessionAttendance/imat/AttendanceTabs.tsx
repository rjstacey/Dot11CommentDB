import { Tabs, Tab } from "react-bootstrap";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
	setUiProperties,
	selectUiProperties,
} from "@/store/imatAttendanceSummary";
import type { MemberChange } from "@/store/members";
import { SessionAttendanceSummaryChange } from "@/store/attendanceSummaries";

import { MemberBasicEdit } from "../../members/detail/MemberBasicEdit";
import { MemberStatusEdit } from "../../members/detail/MemberStatusEdit";
import { MemberContactEdit } from "../../members/detail/MemberContactEdit";
import { AttendanceInfoEdit } from "./AttendanceInfoEdit";
import type {
	EditAction,
	MultipleMember,
	MultipleSessionAttendanceSummary,
} from "./useMemberAttendanceEdit";

export function AttendanceTabs({
	sapins,
	editedMember,
	savedMember,
	onChangeMember,
	editedAttendance,
	savedAttendance,
	onChangeAttendance,
	readOnly,
}: {
	action: EditAction;
	sapins: number[];
	editedMember: MultipleMember;
	savedMember?: MultipleMember;
	onChangeMember: (changes: MemberChange) => void;
	editedAttendance: MultipleSessionAttendanceSummary;
	savedAttendance: MultipleSessionAttendanceSummary;
	onChangeAttendance: (changes: SessionAttendanceSummaryChange) => void;
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
			<Tab eventKey="basic" title="Basic">
				<MemberBasicEdit
					sapins={sapins}
					edited={editedMember}
					saved={savedMember}
					onChange={onChangeMember}
					readOnly={readOnly}
				/>
			</Tab>
			<Tab eventKey="contact" title="Contact">
				<MemberContactEdit
					edited={editedMember}
					saved={savedMember}
					onChange={onChangeMember}
				/>
			</Tab>
			<Tab eventKey="status" title="Status">
				<MemberStatusEdit
					edited={editedMember}
					saved={savedMember}
					onChange={onChangeMember}
				/>
			</Tab>
			<Tab eventKey="attendance" title="Attendance">
				<AttendanceInfoEdit
					edited={editedAttendance}
					saved={savedAttendance}
					onChange={onChangeAttendance}
				/>
			</Tab>
		</Tabs>
	);
}
