/*
 * Handle the legacy (Adrian's comment database) spreadsheet file
 */

const ExcelJS = require('exceljs')

const legacyColumns = [
	{	header: 'CID',
		width: 8,
	},
	{	header: 'Commenter',
		width: 14,
		outlineLevel: 1,
	},
	{	header: 'LB',
		width: 8,
		outlineLevel: 1,
	},
	{	header: 'Draft',
		width: 8,
		outlineLevel: 1,
	},
	{	header: 'Clause Number(C)',
		width: 11,
		outlineLevel: 1,
	},
	{	header: 'Page(C)',
		width: 8,
		outlineLevel: 1,
	},
	{	header: 'Line(C)',
		width: 8,
		outlineLevel: 1,
	},
	{	header: 'Type of Comment',
		width: 10,
		outlineLevel: 1,
	},
	{	header: 'Part of No Vote',
		width: 10,
		outlineLevel: 1,
	},
	{	header: 'Page',
		width: 8,
		numFmt: '#0.00',
	},
	{	header: 'Line',
		width: 7,
		outlineLevel: 1,
	},
	{	header: 'Clause',
		width: 11,
		numFmt: '@',
	},
	{	header: 'Duplicate of CID',
		width: 10
	},
	{	header: 'Resn Status',
		width: 8,
		numFmt: '@',
	},
	{	header: 'Assignee',
		width: 11,
		outlineLevel: 1,
		numFmt: '@',
	},
	{	header: 'Submission',
		width: 12,
		outlineLevel: 1,
		numFmt: '@',
	},
	{	header: 'Motion Number',
		width: 9,
		outlineLevel: 1,
	},
	{	header: 'Comment',
		width: 25,
		numFmt: '@',
	},
	{	header: 'Proposed Change',
		width: 25,
		numFmt: '@',
	},
	{	header: 'Resolution',
		width: 25,
		numFmt: '@',
	},
	{	header: 'Owning Ad-hoc',
		width: 9,
		numFmt: '@',
	},
	{	header: 'Comment Group',
		width: 10,
		numFmt: '@',
	},
	{	header: 'Ad-hoc Status',
		width: 10,
		numFmt: '@',
	},
	{	header: 'Ad-hoc Notes',
		width: 25,
		numFmt: '@',
	},
	{	header: 'Edit Status',
		width: 8,
		numFmt: '@',
	},
	{	header: 'Edit Notes',
		width: 25,
		numFmt: '@',
	},
	{	header: 'Edited in Draft',
		width: 9,
		numFmt: '@',
	},
	{	header: 'Last Updated',
		width: 15,
		outlineLevel: 1,
		numFmt: 'yyyy-mm-dd hh:mm',
	},
	{	header: 'Last Updated By',
		numFmt: '@',
		outlineLevel: 1
	}
];


export async function parseLegacyCommentsSpreadsheet(buffer, sheetName) {

	var workbook = new ExcelJS.Workbook()
	await workbook.xlsx.load(buffer)
	//console.log(workbook, buffer)
	const worksheet = workbook.getWorksheet(sheetName)
	if (!worksheet) {
		let sheets = []
		workbook.eachSheet((worksheet, sheetId) => {sheets.push(worksheet.name)})
		throw `Workbook does not have a "${sheetName}" worksheet. It does have the following worksheets:\n${sheets.join(', ')}`
	}

	// Row 1 is the header
	const headerRow = worksheet.getRow(1).values;
	headerRow.shift();	// Adjust to zero based column numbering
	if (legacyColumns.reduce((r, v, i) => r || v.header !== headerRow[i], false)) {
		throw `Unexpected column headings ${headerRow.join(', ')}. \n\nExpected ${legacyColumns.map(v => v.header).join(', ')}.`
	}

	var comments = [];
	worksheet.eachRow(row => {
		const entry = legacyColumns.reduce((entry, v, i) => {entry[v.header] = row.getCell(i+1).text || ''; return entry}, {})
		comments.push(entry)
	});
	comments.shift();	// remove header
	//console.log(comments.slice(0, 4))

	return comments
}

export function processHtml(html) {
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

	return html
}

const mapResnStatus = {
	A: 'ACCEPTED',
	J: 'REJECTED',
	V: 'REVISED'
};

function genLegacyResolution(c) {
	let r = '';
	if (c.ResnStatus && mapResnStatus[c.ResnStatus]) {
		r += mapResnStatus[c.ResnStatus] + ' - '
	}
	if (c.Resolution) {
		r += processHtml(c.Resolution)
	}
	return r;
}

function genLegacyWorksheetTable(sheet, ballotId, doc, comments) {

	let columnsSet = {
		'CID': c => c.CID,
		'Commenter': c => c.CommenterName  || '',
		'LB': ballotId,
		'Draft': doc,
		'Clause Number(C)': c => c.C_Clause  || '',
		'Page(C)': c => c.C_Page  || '',
		'Line(C)': c => c.C_Line  || '',
		'Type of Comment': c => c.Category  || '',
		'Part of No Vote': c => c.MustSatisfy? "Yes": "No",
		'Page': c => c.Page,
		'Line': c => c.C_Line,
		'Clause': c => c.Clause || '',
		'Duplicate of CID': '',
		'Resn Status': c => c.ResnStatus || '',
		'Assignee': c => c.AssigneeName || '',
		'Submission': c => c.Submission || '',
		'Motion Number': c => c.ApprovedByMotion || '',
		'Comment': c => c.Comment || '',
		'Proposed Change': c => c.ProposedChange || '',
		'Resolution': c => genLegacyResolution(c),
		'Owning Ad-hoc': c => c.AdHoc || '',
		'Comment Group': c => c.CommentGroup || '',
		'Ad-hoc Status': c => c.Status || '',
		'Ad-hoc Notes': c => processHtml(c.Notes),
		'Edit Status': c => c.EditStatus || '',
		'Edit Notes': c => processHtml(c.EditNotes),
		'Edited in Draft': c => c.EditInDraft || '',
		'Last Updated': c => c.LastModifiedTime,
		'Last Updated By': ''
	};

	sheet.addRow(legacyColumns.map(col => col.header));

	// array of unique comments
	const comment_ids = [...new Set(comments.map(c => c.comment_id))];
	let n = 2;
	comment_ids.forEach(id => {
		const cmts = comments.filter(c => c.comment_id === id);
		cmts.forEach((c, i) => {
			const row = sheet.getRow(n);
			row.values = Object.values(columnsSet).map(value => typeof value === 'function'? value(c): (value || ''));
			n++;
		});
		if (cmts.length > 1) {
			// Merge cells with the same value
			['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'R', 'S', 'U', 'V', 'W', 'X'].forEach(col => {
				sheet.mergeCells(col + (n-cmts.length).toString(), col + (n-1).toString(),);
			})			
		}
	})

	sheet.autoFilter = 'A1:AC1';
	// Adjust column width, outlineLevel and style
	const borderStyle = {style:'thin', color: {argb:'33333300'}}
	let i = 0
	legacyColumns.forEach((entry, i) => {
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

const CommentsSpreadsheetFormat = {
	AllComments: 'AllComments',
	TabPerAdHoc: 'TabPerAdHoc',
	TabPerCommentGroup: 'TabPerCommentGroup'
}

export async function genLegacyCommentSpreadsheet(user, ballotId, format, doc, comments, file, res) {

	if (!Object.values(CommentsSpreadsheetFormat).includes(format))
		throw 'Invalid Format parameter: expected one of ' + Object.values(CommentsSpreadsheetFormat).join(', ');

	let workbook = new ExcelJS.Workbook();
	if (file) {
		try {
			await workbook.xlsx.load(file.buffer)
		}
		catch(err) {
			throw "Invalid workbook: " + err
		}
		let ids = []
		workbook.eachSheet(sheet => {
			if (sheet.name !== 'Title' && sheet.name !== 'Revision History') {
				ids.push(sheet.id)
			}
		});
		for (let id of ids) {
			workbook.removeWorksheet(id)
		}
	}
	else {
		workbook.creator = user.Name;
		workbook.created = new Date();
	}
	workbook.lastModifiedBy = user.Name;
	workbook.modified = new Date();

	let sheet = workbook.addWorksheet('All Comments');
	genLegacyWorksheetTable(sheet, ballotId, doc, comments);
	if (format === CommentsSpreadsheetFormat.TabPerAdHoc) {
		// List of unique AdHoc values
		const adhocs = [...new Set(comments.map(c => c.AdHoc || '(Blank)'))].sort();
		adhocs.forEach(adhoc => {
			// Sheet name cannot be longer than 31 characters and cannot include: * ? : \ / [ ]
			const sheetName = adhoc.substr(0,30).replace(/[*.\?:\\\/\[\]]/g, '_');
			sheet = workbook.addWorksheet(sheetName);
			const selectComments = comments.filter(c => adhoc === '(Blank)'? !c.AdHoc: c.AdHoc === adhoc);
			genLegacyWorksheetTable(sheet, ballotId, doc, selectComments);
		});
	}
	else if (format === CommentsSpreadsheetFormat.TabPerCommentGroup) {
		// List of unique CommentGroup values
		const groups = [...new Set(comments.map(c => c.CommentGroup || '(Blank)'))].sort();
		groups.forEach(group => {
			const sheetName = group.substr(0,30).replace(/[*.\?:\\\/\[\]]/g, '_');
			sheet = workbook.addWorksheet(sheetName);
			const selectComments = comments.filter(c => group === '(Blank)'? !c.CommentGroup: c.CommentGroup === group);
			genLegacyWorksheetTable(sheet, ballotId, doc, selectComments);
		});
	}

	try {
		await workbook.xlsx.write(res)
	}
	catch(err) {
		throw "Unable to regenerate workbook: " + err
	}
}
