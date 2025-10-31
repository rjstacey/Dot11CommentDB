import ExcelJS from "exceljs";
import type { Response } from "express";
import type { MemberAttendance } from "./attendances.js";
import { UserContext } from "./users.js";
import { Group } from "@schemas/groups.js";
import { Session } from "@schemas/sessions.js";

type Col = {
	label: string;
	width: number;
	set?: (m: MemberAttendance) => string | number | boolean;
};

const attendanceColumns: Col[] = [
	{ label: "Name", width: 30, set: (a) => a.Name },
	{ label: "Affiliation", width: 40, set: (a) => a.Affiliation },
	{
		label: "Attended ≥ 75%",
		width: 18,
		set: (m) => (m.AttendancePercentage || 0) >= 75,
	},
	{
		label: "Status",
		width: 18,
		set: (a) => (a.Status === "Observer" ? "Non-Voter" : a.Status),
	},
];

export function genAttendanceSpreadsheet(
	user: UserContext,
	group: Group,
	session: Session,
	attendances: MemberAttendance[],
	res: Response
) {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = user.Name;
	const worksheet = workbook.addWorksheet();

	Object.values(attendanceColumns).forEach((col, i) => {
		worksheet.getColumn(i + 1).width = col.width;
	});

	worksheet.addTable({
		name: "attendance", // Numbers in table name result in a corrupt spreadsheet warning
		ref: "A1",
		headerRow: true,
		totalsRow: false,
		style: {
			theme: "TableStyleLight16",
			showRowStripes: true,
		},
		columns: attendanceColumns.map((col) => ({
			name: col.label,
			filterButton: true,
		})),
		rows: attendances.map((a) =>
			attendanceColumns.map((col) =>
				typeof col.set === "function" ? col.set(a) : col.set || ""
			)
		),
	});

	res.attachment(`${group.name}_${session.number}_attendance.xlsx`);
	return workbook.xlsx.write(res);
}
