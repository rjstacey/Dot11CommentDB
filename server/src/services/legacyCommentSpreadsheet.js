/*
 * Handle the legacy (Adrian's comment database) spreadsheet file
 */

const ExcelJS = require('exceljs')

const legacyCommentsHeader = [
	'CID', 'Commenter', 'LB', 'Draft', 'Clause Number(C)', 'Page(C)', 'Line(C)', 'Type of Comment', 'Part of No Vote',
	'Page', 'Line', 'Clause', 'Duplicate of CID', 'Resn Status', 'Assignee', 'Submission', 'Motion Number',
	'Comment', 'Proposed Change', 'Resolution',	'Owning Ad-hoc', 'Comment Group', 'Ad-hoc Status', 'Ad-hoc Notes',
	'Edit Status', 'Edit Notes', 'Edited in Draft', 'Last Updated', 'Last Updated By'
]

export async function parseLegacyCommentsSpreadsheet(buffer, sheetName) {

	var workbook = new ExcelJS.Workbook()
	await workbook.xlsx.load(buffer)
	console.log(workbook, buffer)
	const worksheet = workbook.getWorksheet(sheetName)
	if (!worksheet) {
		let sheets = []
		workbook.eachSheet((worksheet, sheetId) => {sheets.push(worksheet.name)})
		throw `Workbook does not have a "${sheetName}" worksheet. It does have the following worksheets:\n${sheets.join(', ')}`
	}
	//console.log(worksheet.rowCount)

	// Row 0 is the header
	var header = worksheet.getRow(1).values;
	header.shift();	// Remove column 0
	if (legacyCommentsHeader.reduce((r, v, i) => r || v !== header[i], false)) {
		throw `Unexpected column headings ${header.join()}. Expected ${legacyCommentsHeader.join()}.`
	}

	var comments = [];
	worksheet.eachRow(row => {
		const entry = legacyCommentsHeader.reduce((entry, key, i) => {entry[key] = row.getCell(i+1).text || ''; return entry}, {})
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
	if (c.ResnStatus) {
		r += mapResnStatus[c.ResnStatus] + ' - '
	}
	if (c.Resolution) {
		r += processHtml(c.Resolution)
	}
	return r;
}

function genLegacyWorksheetTable(sheet, ballotId, doc, comments) {

	let columns = {
		'CID': {
			width: 6,
			numFmt: '@',
			value: c => c.CID
		},
		'Commenter': {
			width: 14,
			outlineLevel: 1,
			numFmt: '@',
			value: c => c.CommenterName  || ''
		},
		'LB': {
			width: 8,
			outlineLevel: 1,
			numFmt: '@',
			value: ballotId
		},
		'Draft': {
			width: 8,
			outlineLevel: 1,
			numFmt: '@',
			value: doc
		},
		'Clause Number(C)': {
			width: 11,
			outlineLevel: 1,
			numFmt: '@',
			value: c => c.C_Clause  || ''
		},
		'Page(C)': {
			width: 8,
			outlineLevel: 1,
			numFmt: '@',
			value: c => c.C_Page  || ''
		},
		'Line(C)': {
			width: 8,
			outlineLevel: 1,
			numFmt: '@',
			value: c => c.C_Line  || ''
		},
		'Type of Comment': {
			width: 10,
			outlineLevel: 1,
			numFmt: '@',
			value: c => c.Category  || ''
		},
		'Part of No Vote': {
			width: 10,
			outlineLevel: 1,
			numFmt: '@',
			value: c => c.MustSatisfy? "Yes": "No"
		},
		'Page': {
			width: 8,
			numFmt: '#0.00',
			value: c => c.Page
		},
		'Line': {
			width: 7,
			outlineLevel: 1,
			value: c => c.C_Line
		},
		'Clause': {
			width: 11,
			numFmt: '@',
			value: c => c.Clause || ''
		},
		'Duplicate of CID': {width: 10},
		'Resn Status': {
			width: 8,
			numFmt: '@',
			value: c => c.ResnStatus || ''
		},
		'Assignee': {
			width: 11,
			outlineLevel: 1,
			numFmt: '@',
			value: c => c.AssigneeName || ''
		},
		'Submission': {
			width: 12,
			outlineLevel: 1,
			numFmt: '@',
			value: c => c.Submission || ''
		},
		'Motion Number': {
			width: 9,
			outlineLevel: 1,
			value: c => c.ApprovedByMotion || ''
		},
		'Comment': {
			width: 25,
			numFmt: '@',
			value: c => c.Comment || ''
		},
		'Proposed Change': {
			width: 25,
			numFmt: '@',
			value: c => c.ProposedChange || ''
		},
		'Resolution': {
			width: 25,
			numFmt: '@',
			value: c => genLegacyResolution(c)
		},
		'Owning Ad-hoc': {
			width: 9,
			numFmt: '@',
			value: c => c.AdHoc || ''
		},
		'Comment Group': {
			width: 10,
			numFmt: '@',
			value: c => c.CommentGroup || ''
		},
		'Ad-hoc Status': {
			width: 10,
			numFmt: '@',
			value: c => c.Status || ''
		},
		'Ad-hoc Notes': {
			width: 25,
			numFmt: '@',
			value: c => processHtml(c.Notes)
		},
		'Edit Status': {
			width: 8,
			numFmt: '@',
			value: c => c.EditStatus || ''
		},
		'Edit Notes': {
			width: 25,
			numFmt: '@',
			value: c => processHtml(c.EditNotes)
		},
		'Edited in Draft': {
			width: 9,
			numFmt: '@',
			value: c => c.EditInDraft || ''
		},
		'Last Updated': {
			width: 15,
			outlineLevel: 1,
			numFmt: 'yyyy-mm-dd hh:mm',
			value: c => c.LastModifiedTime
		},
		'Last Updated By': {
			numFmt: '@',
			outlineLevel: 1
		}
	};

	const colNames = Object.keys(columns);

	let table = {
		name: 'My Table',
		ref: 'A1',
		headerRow: true,
		totalsRow: false,
		style: {
			theme: 'TableStyleLight15',
			showRowStripes: false,
		},
		columns: colNames.map(name => ({name, filterButton: true})),
		rows: comments.map(c => colNames.map(key => {
			let col = columns[key]
			const v = typeof col.value === 'function'? col.value(c): (col.value || '');
			return v;
		}))
	};
	//sheet.addTable(table)

	sheet.addRow(colNames)
	sheet.addRows(comments.map(c => colNames.map(key => {
			let col = columns[key]
			const v = typeof col.value === 'function'? col.value(c): (col.value || '');
			return v;
		})))
	sheet.autoFilter = 'A1:AC1';
	// Adjust column width, outlineLevel and style
	const borderStyle = {style:'thin', color: {argb:'33333300'}}
	let i = 0
	for (let key of colNames) {
		let col = columns[key]
		i++
		if (col.width)
			sheet.getColumn(i).width = col.width
		if (col.outlineLevel)
			sheet.getColumn(i).outlineLevel = col.outlineLevel
		if (col.numFmt)
			sheet.getColumn(i).numFmt = col.numFmt
		sheet.getColumn(i).font = {name: 'Arial', size: 10, family: 2}
		sheet.getColumn(i).alignment = {wrapText: true, vertical: 'top'}
		sheet.getColumn(i).border = {
			top: borderStyle, 
			left: borderStyle, 
			bottom: borderStyle, 
			right: borderStyle
		}
	}
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
		console.log(adhocs)
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
