import ExcelJS from "exceljs";
import { csvParse } from "../utils/index.js";
import type { SessionRegistration } from "@schemas/registration.js";

type SessionRegistrationSS = Pick<
	SessionRegistration,
	"id" | "SAPIN" | "Name" | "FirstName" | "LastName" | "Email" | "RegType"
>;

export async function parseRegistrationSpreadsheet(
	filename: string,
	buffer: Buffer
) {
	let rows: string[][]; // an array of arrays
	if (filename.search(/\.xlsx$/i) >= 0) {
		const workbook = new ExcelJS.Workbook();
		try {
			await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
		} catch (error) {
			throw TypeError("Invalid workbook: " + error);
		}

		rows = [];
		workbook.worksheets[0]?.eachRow((row) => {
			const nCols = Math.max(row.cellCount, 20);
			const cRow = Array(nCols)
				.fill("")
				.map((_, i) => row.getCell(i + 1).text);
			rows.push(cRow);
		});
	} else if (filename.search(/\.csv$/i) >= 0) {
		rows = await csvParse(buffer, {
			columns: false,
			bom: true,
			encoding: "latin1",
		});
	} else {
		throw TypeError(
			"Must be an Excel Workbook (*.xlsx) or .csv file. Older Excel Workbook formats are not supported."
		);
	}

	if (rows.length === 0) throw new TypeError("Empty spreadsheet file");

	const emailIndex = rows[0].findIndex((v) => /email/i.test(v));
	if (emailIndex < 0) throw new TypeError("Can't find Email Address column");
	const sapinIndex = rows[0].findIndex((v) => /SA PIN|SAPIN/i.test(v));
	if (sapinIndex < 0) throw new TypeError("Can't find SA PIN column");
	const regTypeIndex = rows[0].findIndex((v) => /registration/i.test(v));
	if (regTypeIndex < 0)
		throw new TypeError("Can't find registration type column");
	const fullNameIndex = rows[0].findIndex((v) => /full name/i.test(v));
	const firstNameIndex = rows[0].findIndex((v) => /first name/i.test(v));
	const lastNameIndex = rows[0].findIndex((v) => /last name/i.test(v));
	if (fullNameIndex < 0 && (firstNameIndex < 0 || lastNameIndex < 0))
		throw new TypeError(
			"Need either Full Name or both First and Last Name columns"
		);
	rows.shift();
	const registrations = rows.map((r, id) => {
		let Name: string;
		const FirstName = firstNameIndex >= 0 ? r[firstNameIndex] : "";
		const LastName = lastNameIndex >= 0 ? r[lastNameIndex] : "";
		if (fullNameIndex >= 0) Name = r[fullNameIndex];
		else Name = FirstName + " " + LastName;
		return {
			id,
			SAPIN: Number(r[sapinIndex]) || null,
			Name,
			FirstName,
			LastName,
			Email: r[emailIndex],
			RegType: r[regTypeIndex],
		} satisfies SessionRegistrationSS;
	});
	return registrations;
}
