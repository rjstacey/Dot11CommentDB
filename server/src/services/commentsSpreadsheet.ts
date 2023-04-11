/*
 * Handle the legacy (Adrian's comment database) spreadsheet file
 */
import ExcelJS from 'exceljs';
import type { CommentResolution } from './comments';

function parseResolution(v: any, c: Partial<CommentResolution>) {
	if (typeof v === 'string') {
		
		// Override 'Resn Status' if the resolution itself has something that looks like a resolution status
		if (v.search(/^\s*(ACCEPT|ACCEPTED)/i) >= 0)
			c.ResnStatus = 'A';
		else if (v.search(/^\s*(REVISE|REVISED)/i) >= 0)
			c.ResnStatus = 'V';
		else if (v.search(/^\s*(REJECT|REJECTED)/i) >= 0)
			c.ResnStatus = 'J';

		// Remove the resolution status if it exists. And leading whitespace or dash.
		c.Resolution = v.replace(/^\s*(ACCEPTED|ACCEPT|REVISED|REVISE|REJECTED|REJECT)[:-\s\n]*/i, '');
		c.Resolution = toHtml(c.Resolution);
	}
}

const mapResnStatus = {
	A: 'ACCEPTED',
	J: 'REJECTED',
	V: 'REVISED'
};

function genResolution(c: CommentResolution) {
	let r = '';
	if (c.ResnStatus && mapResnStatus[c.ResnStatus]) {
		r += mapResnStatus[c.ResnStatus];
		if (c.Resolution)
			r += '\n';
	}
	if (c.Resolution) {
		r += fromHtml(c.Resolution);
	}
	return r;
}

function parsePage(v: string) {
	let page = parseFloat(v);
	if (isNaN(page))
		page = 0;
	return page;
}

function genStatus(c: CommentResolution) {
	let Status = '';
	if (c.ApprovedByMotion)
		Status = 'Resolution approved';
	else if (c.ReadyForMotion)
		Status = 'Ready for motion';
	else if (c.ResnStatus)
		Status = 'Resolution drafted';
	else if (c.AssigneeName)
		Status = 'Assigned';
	return Status;
}

type ColSet = (c: CommentResolution) => any;
type ColGet = (v: any, c: Partial<CommentResolution>) => void;

type Col = {
	width?: number;
	outlineLevel?: number;
	numFmt?: string;
	set?: ColSet;
	get?: ColGet;
	value?: any;
}

const legacyColumns: Record<string, Col> = {
	'CID': {
		width: 8,
		set: c => parseFloat('' + c.CID),
		get: (v, c) => c.CID = v
	},
	'Commenter': {
		width: 14,
		outlineLevel: 1,
		set: c => c.CommenterName  || '',
		get: (v, c) => c.CommenterName = v
	},
	'LB': {
		width: 8,
		outlineLevel: 1,
	},
	'Draft': {
		width: 8,
		outlineLevel: 1,
	},
	'Clause Number(C)': {
		width: 11,
		outlineLevel: 1,
		set: c => c.C_Clause  || '',
		get: (v, c) => c.C_Clause = v
	},
	'Page(C)': {
		width: 8,
		outlineLevel: 1,
		set: c => c.C_Page  || '',
		get: (v, c) => c.C_Page = v
	},
	'Line(C)': {
		width: 8,
		outlineLevel: 1,
		set: c => c.C_Line  || '',
		get: (v, c) => c.C_Line = v
	},
	'Type of Comment': {
		width: 10,
		outlineLevel: 1,
		set: c => c.Category  || '',
		get: (v, c) => c.Category = v
	},
	'Part of No Vote': {
		width: 10,
		outlineLevel: 1,
		set: c => c.MustSatisfy? "Yes": "No",
		get: (v, c) => c.MustSatisfy = v === 'Yes'
	},
	'Page': {
		width: 8,
		numFmt: '#0.00',
		set: c => c.Page,
		get: (v, c) => c.Page = parsePage(v)
	},
	'Line': {
		width: 7,
		outlineLevel: 1,
		set: c => c.C_Line || ''
	},
	'Clause': {
		width: 11,
		numFmt: '@',
		set: c => c.Clause || '',
		get: (v, c) => c.Clause = v
	},
	'Duplicate of CID': {
		width: 10,
		value: ''
	},
	'Resn Status': {
		width: 8,
		numFmt: '@',
		set: c => c.ResnStatus || '',
		get: (v, c) => c.ResnStatus = v
	},
	'Assignee': {
		width: 11,
		outlineLevel: 1,
		numFmt: '@',
		set: c => c.AssigneeName || '',
		get: (v, c) => c.AssigneeName = v
	},
	'Submission': {
		width: 12,
		outlineLevel: 1,
		numFmt: '@',
		set: c => c.Submission || '',
		get: (v, c) => c.Submission = v
	},
	'Motion Number': {
		width: 9,
		outlineLevel: 1,
		set: c => c.ApprovedByMotion || '',
		get: (v, c) => c.ApprovedByMotion = v
	},
	'Comment': {
		width: 25,
		numFmt: '@',
		set: c => c.Comment || '',
		get: (v, c) => c.Comment = v
	},
	'Proposed Change': {
		width: 25,
		numFmt: '@',
		set: c => c.ProposedChange || '',
		get: (v, c) => c.ProposedChange = v
	},
	'Resolution': {
		width: 25,
		numFmt: '@',
		set: genResolution,
		get: parseResolution
	},
	'Owning Ad-hoc': {
		width: 9,
		numFmt: '@',
		set: c => c.AdHoc || '',
		get: (v, c) => c.AdHoc = v
	},
	'Comment Group': {
		width: 10,
		numFmt: '@',
		value: c => c.CommentGroup || '',
		get: (v, c) => c.CommentGroup = v
	},
	'Ad-hoc Status': {
		width: 10,
		numFmt: '@',
		set: c => genStatus(c)
	},
	'Ad-hoc Notes': {
		width: 25,
		numFmt: '@',
		set: c => fromHtml(c.Notes),
		get: (v, c) => c.Notes = toHtml(v)
	},
	'Edit Status': {
		width: 8,
		numFmt: '@',
		set: c => c.EditStatus || ''
	},
	'Edit Notes': {
		width: 25,
		numFmt: '@',
		set: c => fromHtml(c.EditNotes),
		get: (v, c) => c.EditNotes = toHtml(v)
	},
	'Edited in Draft': {
		width: 9,
		numFmt: '@',
		set: c => c.EditInDraft || '',
		get: (v, c) => c.EditInDraft = v
	},
	'Last Updated': {
		width: 15,
		outlineLevel: 1,
		numFmt: 'yyyy-mm-dd hh:mm',
		set: c => c.LastModifiedTime
	},
	'Last Updated By': {
		numFmt: '@',
		outlineLevel: 1,
		set: () => ''
	}
};

const modernColumns: Record<string, Col> = {
	'CID': {
		width: 8,
		set: c => parseFloat('' + c.CID),
		get: (v, c) => c.CID = v
	},
	'Commenter': {
		width: 14,
		outlineLevel: 2,
		set: c => c.CommenterName  || '',
		get: (v, c) => c.CommenterName = v
	},
	'Must Be Satisfied': {
		width: 10,
		outlineLevel: 2,
		set: c => c.MustSatisfy? "Yes": "No",
		get: (v, c) => c.MustSatisfy = v === 'Yes'
	},
	'Clause Number(C)': {
		width: 11,
		outlineLevel: 2,
		set: c => c.C_Clause  || '',
		get: (v, c) => c.C_Clause = v
	},
	'Page(C)': {
		width: 8,
		outlineLevel: 2,
		set: c => c.C_Page  || '',
		get: (v, c) => c.C_Page = v
	},
	'Line(C)': {
		width: 8,
		outlineLevel: 2,
		set: c => c.C_Line  || '',
		get: (v, c) => c.C_Line = v
	},
	'Category': {
		width: 10,
		outlineLevel: 2,
		set: c => c.Category  || '',
		get: (v, c) => c.Category = v
	},
	'Clause': {
		width: 11,
		numFmt: '@',
		set: c => c.Clause || '',
		get: (v, c) => c.Clause = v
	},
	'Page': {
		width: 8,
		numFmt: '#0.00',
		set: c => c.Page,
		get: (v, c) => c.Page = parsePage(v)
	},
	'Comment': {
		width: 25,
		numFmt: '@',
		set: c => c.Comment || '',
		get: (v, c) => c.Comment = v
	},
	'Proposed Change': {
		width: 25,
		numFmt: '@',
		set: c => c.ProposedChange || '',
		get: (v, c) => c.ProposedChange = v
	},
	'Ad-hoc': {
		width: 9,
		numFmt: '@',
		outlineLevel: 1,
		set: c => c.AdHoc || '',
		get: (v, c) => c.AdHoc = v
	},
	'Comment Group': {
		width: 10,
		numFmt: '@',
		outlineLevel: 1,
		value: c => c.CommentGroup || '',
		get: (v, c) => c.CommentGroup = v
	},
	'Ad-hoc Notes': {
		width: 25,
		numFmt: '@',
		outlineLevel: 1,
		set: c => fromHtml(c.Notes),
		get: (v, c) => c.Notes = toHtml(v)
	},
	'Status': {
		width: 10,
		numFmt: '@',
		set: genStatus
	},
	'Assignee': {
		width: 11,
		outlineLevel: 1,
		numFmt: '@',
		set: c => c.AssigneeName || '',
		get: (v, c) => c.AssigneeName = v
	},
	'Submission': {
		width: 12,
		outlineLevel: 1,
		numFmt: '@',
		set: c => c.Submission || '',
		get: (v, c) => c.Submission = v
	},
	'Resn Status': {
		width: 8,
		numFmt: '@',
		set: c => c.ResnStatus || '',
		get: (v, c) => c.ResnStatus = v
	},
	'Resolution': {
		width: 25,
		numFmt: '@',
		set: genResolution,
		get: parseResolution
	},
	'Ready For Motion': {
		width: 9,
		outlineLevel: 1,
		set: c => c.ReadyForMotion? "Yes": "",
		get: (v, c) => c.ReadyForMotion = v.search(/y|1/i) >= 0
	},
	'Motion Number': {
		width: 9,
		outlineLevel: 1,
		set: c => c.ApprovedByMotion || '',
		get: (v, c) => c.ApprovedByMotion = v
	},
	'Edit Status': {
		width: 8,
		numFmt: '@',
		set: c => c.EditStatus || ''
	},
	'Edited in Draft': {
		width: 9,
		numFmt: '@',
		set: c => c.EditInDraft || '',
		get: (v, c) => c.EditInDraft = v
	},
	'Edit Notes': {
		width: 25,
		numFmt: '@',
		set: c => fromHtml(c.EditNotes),
		get: (v, c) => c.EditNotes = toHtml(v)
	},
	'Last Updated': {
		width: 15,
		outlineLevel: 1,
		numFmt: 'yyyy-mm-dd hh:mm',
		set: c => c.LastModifiedTime
	},
	'Last Updated By': {
		numFmt: '@',
		outlineLevel: 1,
		set: () => ''
	}
};

const commentColumns = [
	'Commenter',
	'LB',
	'Draft',
	'Must Be Satisfied',
	'Clause Number(C)',
	'Page(C)',
	'Line(C)',
	'Category',
	'Type of Comment',
	'Clause',
	'Page',
	'Comment',
	'Proposed Change',
	'Ad-hoc',
	'Comment Group',
	'Ad-hoc Notes',
];

function headingsMatch(headingRow: string[], expectedHeadings: string[]) {
	return !expectedHeadings.reduce((result, heading, i) => result || heading !== headingRow[i], false)
}

export async function parseCommentsSpreadsheet(buffer: Buffer, sheetName: string) {

	var workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);
	//console.log(workbook, buffer)
	const worksheet = workbook.getWorksheet(sheetName);
	if (!worksheet) {
		let sheets: string[] = [];
		workbook.eachSheet((worksheet, sheetId) => {sheets.push(worksheet.name)});
		throw new Error(`Workbook does not have a "${sheetName}" worksheet. It does have the following worksheets:\n${sheets.join(', ')}`);
	}

	// Row 1 is the header
	const headerRow: string[] = worksheet.getRow(1).values as string[];
	headerRow.shift();	// Adjust to zero based column numbering
	const legacyHeadings = Object.keys(legacyColumns);
	const modernHeadings = Object.keys(modernColumns);
	const isLegacy = headingsMatch(headerRow, legacyHeadings)
	if (!isLegacy && !headingsMatch(headerRow, modernHeadings)) {
		throw new Error(
			`Unexpected column headings ${headerRow.join(', ')}. ` +
			`\n\nExpected legacy headings: ${legacyHeadings.join(', ')}.` +
			`\n\nOr modern headings: ${modernHeadings.join(', ')}.`
		);
	}

	var comments: CommentResolution[] = [];
	const columns = isLegacy? legacyColumns: modernColumns;
	worksheet.eachRow(row => {
		const entry: Partial<CommentResolution> = {}
		Object.values(columns).forEach((col, i) => col.get && col.get(row.getCell(i+1).text, entry));
		comments.push(entry as CommentResolution)
	});
	comments.shift();	// remove header
	//console.log(comments.slice(0, 4))

	return comments
}

export function fromHtml(html: string | undefined) {
	if (typeof html !== 'string') return ''

	html = html.replace(/<p\w[^>]*>(.*)<\/p[^>]*>/g, (match, entity) => `${entity}\n`);
	html = html.replace(/<[^>]+>/g, '');

	var translate_re = /&(nbsp|amp|quot|lt|gt);/g;
	var translate = {
		"nbsp": " ",
		"amp" : "&",
		"quot": "\"",
		"lt"  : "<",
		"gt"  : ">"
	};
	html = html.replace(translate_re, (match, entity) => translate[entity]);

	return html;
}

function toHtml(value: string) {
	if (!value)
		return '';

	const s = value
		.split('&').join('&amp;')
		.split('"').join('&quot;')
		.split('<').join('&lt;')
		.split('>').join('&gt;')
		.split('\n').map((line) => `<p>${line}</p>`).join('');
	return s;
}

// Convert column number into letter, e.g. 1 => A, 26 => Z, 27 => AA
const getColRef = (n: number) => n? getColRef(Math.floor((n-1)/26)) + String.fromCharCode(65 + ((n-1) % 26)): '';

function addResolutionFormatting(sheet: ExcelJS.Worksheet, columns, nRows) {
	// Add conditional formating for the "Resolution" column. Color the cell based on Resn Status
	const resolutionColumn = getColRef(Object.keys(columns).indexOf('Resolution')+1)
	const resnStatusColumn = getColRef(Object.keys(columns).indexOf('Resn Status')+1)
	sheet.addConditionalFormatting({
		ref: `\$${resolutionColumn}\$2:\$${resolutionColumn}\$${nRows-1}`,
		rules: [
			{type: 'expression',
				formulae: [`ISNUMBER(SEARCH("A",\$${resnStatusColumn}2))`],
				style: {fill: {type: 'pattern', pattern: 'solid', bgColor: {argb: 'FFd3ecd3'}}},
				priority: 0
			},
			{type: 'expression',
				formulae: [`ISNUMBER(SEARCH("V",\$${resnStatusColumn}2))`],
				style: {fill: {type: 'pattern', pattern: 'solid', bgColor: {argb: 'FFf9ecb9'}}},
				priority: 0
			},
			{type: 'expression',
				formulae: [`ISNUMBER(SEARCH("J",\$${resnStatusColumn}2))`],
				style: {fill: {type: 'pattern', pattern: 'solid', bgColor: {argb: 'FFf3c0c0'}}},
				priority: 0
			},
		]
	});
}

function addStatus(sheet: ExcelJS.Worksheet, columns: Record<string, Col>, nRows: number) {
	const headings = Object.keys(columns);
	const statusIndex = headings.indexOf('Status');
	if (statusIndex < 0)
		return;

	const motionNumberCol = getColRef(headings.indexOf('Motion Number') + 1);
	const readyForMotionCol = getColRef(headings.indexOf('Ready For Motion') + 1);
	const resnStatusCol = getColRef(headings.indexOf('Resn Status') + 1);
	const assigneeCol = getColRef(headings.indexOf('Assignee') + 1);

	// Add formula to derive value for the status column
	const statusCol = getColRef(statusIndex + 1)
	sheet.getCell(2, statusIndex+1).value = {
			formula:
				`=IF(\$${motionNumberCol}2<>"", "Resolution approved", ` +
					`IF(\$${readyForMotionCol}2<>"", "Ready for motion", ` +
						`IF(\$${resnStatusCol}2<>"", "Resolution drafted", ` +
							`IF(\$${assigneeCol}2<>"", "Assigned", ""))))`,
			result: '',
			shareType: 'shared',
			ref: `${statusCol}2:${statusCol}${nRows-1}`
		} as unknown as ExcelJS.CellFormulaValue;
	for (let rowIndex = 3; rowIndex < nRows; rowIndex += 1) {
		sheet.getCell(rowIndex, statusIndex+1).value = {sharedFormula: `${statusCol}2`, result: ''} as ExcelJS.CellSharedFormulaValue;
	}
}

function genWorksheet(sheet: ExcelJS.Worksheet, columns: Record<string, Col>, ballotId: number | string, doc: string, comments: CommentResolution[]) {

	sheet.addRow(Object.keys(columns));

	// array of unique comments
	const comment_ids = [...new Set(comments.map(c => c.comment_id))];
	let n = 2;
	comment_ids.forEach(id => {
		const cmts = comments.filter(c => c.comment_id === id);
		cmts.forEach((c, i) => {
			const row = sheet.getRow(n);
			row.values = Object.keys(columns).map(key => {
				const column = columns[key];
				if (key === 'LB')
					return ballotId;
				else if (key === 'Draft')
					return doc;
				else
					return typeof column.set === 'function'? column.set(c): (column.set || '');
			});
			n++;
		});
		if (cmts.length > 1) {
			// Merge comment cells
			Object.keys(columns).forEach((heading, i) => {
				if (commentColumns.includes(heading)) {
					sheet.mergeCells(n-cmts.length, i+1, n-1, i+1);
				}
			});
		}
	});

	addResolutionFormatting(sheet, columns, n);

	/* This replaces the text version of the Status column with a formula. However, some people prefer the text version. */
	//addStatus(sheet, columns, n);

	// Enable auto filter on heading row
	sheet.autoFilter = {from: {row: 1, column: 1}, to: {row: 1, column: Object.keys(columns).length}};

	// Adjust column width, outlineLevel and style
	const borderStyle: ExcelJS.Border = {style:'thin', color: {argb:'33333300'}}
	let i = 0
	Object.values(columns).forEach((entry, i) => {
		const column = sheet.getColumn(i+1);
		if (entry.width)
			column.width = entry.width;
		if (entry.outlineLevel)
			column.outlineLevel = entry.outlineLevel;
		if (entry.numFmt)
			column.numFmt = entry.numFmt;
		column.font = {name: 'Arial', size: 10, family: 2};
		column.alignment = {wrapText: true, vertical: 'top'};
		column.border = {
			top: borderStyle, 
			left: borderStyle, 
			bottom: borderStyle, 
			right: borderStyle
		};
	})
	// override the column font style for the header row
	sheet.getRow(1).font = {bold: true};

	// Table header is frozen
	sheet.views = [{state: 'frozen', xSplit: 0, ySplit: 1}];
}

const CommentsSpreadsheetStyle = {
	AllComments: 'AllComments',
	TabPerAdHoc: 'TabPerAdHoc',
	TabPerCommentGroup: 'TabPerCommentGroup'
}

export async function genCommentsSpreadsheet(
	user,
	ballotId: number | string,
	isLegacy: boolean,
	style: string,
	doc: string,
	comments: CommentResolution[],
	file: any,
	res
) {
	if (!Object.values(CommentsSpreadsheetStyle).includes(style))
		throw new TypeError('Invalid Style parameter: expected one of ' + Object.values(CommentsSpreadsheetStyle).join(', '));

	let workbook = new ExcelJS.Workbook();
	if (file) {
		try {
			await workbook.xlsx.load(file.buffer)
		}
		catch(err) {
			throw new TypeError("Invalid workbook: " + err);
		}
		let ids: number[] = [];
		workbook.eachSheet(sheet => {
			if (sheet.name !== 'Title' && sheet.name !== 'Revision History') {
				ids.push(sheet.id);
			}
		});
		for (let id of ids) {
			workbook.removeWorksheet(id);
		}
	}
	else {
		workbook.creator = user.Name;
		workbook.created = new Date();
	}
	workbook.lastModifiedBy = user.Name;
	workbook.modified = new Date();

	const columns = isLegacy? legacyColumns: modernColumns;

	let sheet = workbook.addWorksheet('All Comments');
	genWorksheet(sheet, columns, ballotId, doc, comments);
	if (style === CommentsSpreadsheetStyle.TabPerAdHoc) {
		// List of unique AdHoc values
		const adhocs = [...new Set(comments.map(c => c.AdHoc || '(Blank)'))].sort();
		adhocs.forEach(adhoc => {
			// Sheet name cannot be longer than 31 characters and cannot include: * ? : \ / [ ]
			const sheetName = adhoc.substr(0,30).replace(/[*.\?:\\\/\[\]]/g, '_');
			sheet = workbook.addWorksheet(sheetName);
			const selectComments = comments.filter(c => adhoc === '(Blank)'? !c.AdHoc: c.AdHoc === adhoc);
			genWorksheet(sheet, columns, ballotId, doc, selectComments);
		});
	}
	else if (style === CommentsSpreadsheetStyle.TabPerCommentGroup) {
		// List of unique CommentGroup values
		const groups = [...new Set(comments.map(c => c.CommentGroup || '(Blank)'))].sort();
		groups.forEach(group => {
			const sheetName = group.substr(0,30).replace(/[*.\?:\\\/\[\]]/g, '_');
			sheet = workbook.addWorksheet(sheetName);
			const selectComments = comments.filter(c => group === '(Blank)'? !c.CommentGroup: c.CommentGroup === group);
			genWorksheet(sheet, columns, ballotId, doc, selectComments);
		});
	}

	try {
		await workbook.xlsx.write(res);
	}
	catch(err) {
		throw Error("Unable to regenerate workbook: " + err);
	}
}
