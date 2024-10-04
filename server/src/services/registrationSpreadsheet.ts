import ExcelJS from "exceljs";
import { csvParse } from "../utils";

type RegEntry = {
	SAPIN: number;
	Email: string;
	RegType: string;
};

export async function parseRegistrationSpreadsheet(file: {
	originalname: string;
	buffer: Buffer;
}) {
	let rows: string[][]; // an array of arrays
	if (file.originalname.search(/\.xlsx$/i) >= 0) {
		const workbook = new ExcelJS.Workbook();
		try {
			await workbook.xlsx.load(file.buffer);
		} catch (error) {
			throw TypeError("Invalid workbook: " + error);
		}

		rows = [];
		workbook.getWorksheet(1)?.eachRow((row) => {
			if (Array.isArray(row.values))
				rows.push(
					row.values
						.slice(1, 20 + 1)
						.map((r) =>
							typeof r === "string" ? r : r ? r.toString() : ""
						)
				);
		});
	} else if (file.originalname.search(/\.csv$/i) >= 0) {
		rows = await csvParse(file.buffer, {
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
	rows.unshift();
	const registrations = rows.map((r) => {
		return {
			SAPIN: Number(r[sapinIndex]),
			Email: r[emailIndex],
			RegType: r[regTypeIndex],
		} satisfies RegEntry;
	});
	return registrations;
}
