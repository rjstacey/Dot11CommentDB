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

async function parseLegacyCommentsSpreadsheet(buffer, sheetName) {

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

function processHtml(html) {
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

function genLegacyWorksheetTable(sheet, ballotId, doc, comments) {

	let columns = {
		'CID': {width: 6, value: c => c.CID},
		'Commenter': {width: 14, outlineLevel: 1, value: c => c.CommenterName},
		'LB': {width: 8, outlineLevel: 1, value: ballotId},
		'Draft': {width: 8, outlineLevel: 1, value: doc},
		'Clause Number(C)': {width: 11, outlineLevel: 1, value: c => c.C_Clause},
		'Page(C)': {width: 8, outlineLevel: 1, value: c => c.C_Page},
		'Line(C)': {width: 8, outlineLevel: 1, value: c => c.C_Line},
		'Type of Comment': {width: 10, outlineLevel: 1, value: c => c.Category},
		'Part of No Vote': {width: 10, outlineLevel: 1, value: c => c.MustSatisfy? "Yes": "No"},
		'Page': {width: 8, value: c => c.Page},
		'Line': {width: 7, outlineLevel: 1, value: c => c.C_Line},
		'Clause': {width: 11, value: c => c.Clause},
		'Duplicate of CID': {width: 10},
		'Resn Status': {width: 8, value: c => c.ResnStatus || ''},
		'Assignee': {width: 11, outlineLevel: 1, value: c => c.AssigneeName || ''},
		'Submission': {width: 12, outlineLevel: 1, value: c => c.Submission || ''},
		'Motion Number': {width: 9, outlineLevel: 1, value: c => c.ApprovedByMotion || ''},
		'Comment': {width: 25, value: c => c.Comment},
		'Proposed Change': {width: 25, value: c => c.ProposedChange},
		'Resolution': {width: 25, value: c => (c.ResnStatus? mapResnStatus[c.ResnStatus] + '\n': '') + processHtml(c.Resolution)},
		'Owning Ad-hoc': {width: 9},
		'Comment Group': {width: 10, value: c => c.CommentGroup || ''},
		'Ad-hoc Status': {width: 10, value: c => c.Status || ''},
		'Ad-hoc Notes': {width: 25, value: c => c.Notes || ''},
		'Edit Status': {width: 8, value: c => c.EditStatus || ''},
		'Edit Notes': {width: 25, value: c => c.EditNotes || ''},
		'Edited in Draft': {width: 9, value: c => c.EditInDraft || ''},
		'Last Updated': {width: 15, outlineLevel: 1},
		'Last Updated By': {outlineLevel: 1}
	};

	const colNames = Object.keys(columns);

	let table = {
		name: 'MyTable',
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
			if (typeof col.value === 'function') {
				return col.value(c)
			}
			else if (col.value) {
				return col.value
			}
			return ''
		}))
	};

	sheet.addTable(table)

	// Adjust column width, outlineLevel and style
	const borderStyle = {style:'thin', color: {argb:'33333300'}}
	let i = 0
	for (let key of colNames) {
		let col = columns[key]
		i++
		if (col.width) {
			sheet.getColumn(i).width = col.width
		}
		if (col.outlineLevel) {
			sheet.getColumn(i).outlineLevel = col.outlineLevel
		}
		sheet.getColumn(i).font = {name: 'Arial', size: 10, family: 2}
		sheet.getColumn(i).alignment = {wrapText: true, vertical: 'top'}
		/*sheet.getColumn(i).border = {
			top: borderStyle, 
			left: borderStyle, 
			bottom: borderStyle, 
			right: borderStyle
		}*/
	}

	// Table header is frozen
	sheet.views = [{state: 'frozen', xSplit: 0, ySplit: 1}];
}

async function genLegacyCommentsSpreadsheet(ballotId, doc, comments, file, res) {
	
	let workbook = new ExcelJS.Workbook()
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

	let sheet = workbook.addWorksheet('Comments')
	genLegacyWorksheetTable(sheet, ballotId, doc, comments)

	try {
		await workbook.xlsx.write(res)
	}
	catch(err) {
		throw "Unable to regenerate workbook: " + err
	}
}

module.exports = {
	parseLegacyCommentsSpreadsheet,
	genLegacyCommentsSpreadsheet,
	processHtml
}