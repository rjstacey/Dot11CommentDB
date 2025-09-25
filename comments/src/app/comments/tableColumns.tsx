import React from "react";
import {
	SelectExpandHeaderCell,
	SelectExpandCell,
	TableColumnHeader,
	IdSelector,
	IdFilter,
	ColumnProperties,
	HeaderCellRendererProps,
	RowGetterProps,
	ChangeableColumnProperties,
} from "@common";

import { renderMBS, renderCommenter, renderCategory } from "./CommentBasics";
import { renderSubmission } from "./SubmissionSelect";
import { useAppSelector } from "@/store/hooks";
import { selectBallotsState } from "@/store/ballots";
import {
	fields,
	commentsSelectors,
	commentsActions,
	getCommentStatus,
	resnStatusMap,
	type CommentResolution,
	type ResnStatusType,
} from "@/store/comments";

import styles from "./comments.module.css";

const FlexRow = (props: React.ComponentProps<"div">) => (
	<div className={styles.row} {...props} />
);

const renderPage = (page: string | number | null) =>
	typeof page === "number" ? page.toFixed(2) : page;

const renderTextBlock = (value: string) => {
	if (!value) return "";
	return (
		<div className={styles.textBlockContainer}>
			{value.split("\n").map((line, i) => (
				<p key={i}>{line}</p>
			))}
		</div>
	);
};

const renderHtmlAsText = (value: string | null) => {
	const parser = new DOMParser();
	const dom = parser.parseFromString(value || "", "text/html");
	return dom.firstChild?.textContent || "";
};

/*
 * The data cell rendering functions are pure functions (dependent only on input parameters)
 */
const renderHeaderCellEditing = (props: HeaderCellRendererProps) => (
	<>
		<HeaderSubcomponent
			{...props}
			dataKey="EditStatus"
			label="Editing Status" /*dropdownWidth={150}*/
		/>
		<HeaderSubcomponent
			{...props}
			dataKey="EditInDraft"
			label="In Draft" /*dropdownWidth={200}*/
		/>
		<HeaderSubcomponent
			{...props}
			dataKey="EditNotes"
			label="Notes"
			column={{ ...props.column, dataRenderer: renderHtmlAsText }}
		/>
	</>
);

const renderDataCellEditing = ({ rowData }: { rowData: CommentResolution }) => (
	<>
		{rowData.EditStatus === "I" && <span>In D{rowData.EditInDraft}</span>}
		{rowData.EditStatus === "N" && <span>No change</span>}
		{rowData.EditNotes && (
			<div
				className={styles.editor}
				dangerouslySetInnerHTML={{ __html: rowData.EditNotes }}
			/>
		)}
	</>
);

const resnStatusRenderer = (resnStatus: ResnStatusType | null) =>
	resnStatus ? resnStatusMap[resnStatus] : "";

function renderDataCellResolution({ rowData }: { rowData: CommentResolution }) {
	const resnStatus = rowData["ResnStatus"];

	let className = styles.resolutionContainer;
	if (resnStatus === "A") className += " accepted";
	else if (resnStatus === "V") className += " revised";
	else if (resnStatus === "J") className += " rejected";

	return (
		<div className={className}>
			<div>{resnStatusRenderer(resnStatus)}</div>
			<div
				dangerouslySetInnerHTML={{
					__html: rowData["Resolution"] || "",
				}}
			/>
		</div>
	);
}

const DataSubcomponent = ({
	width,
	...props
}: { width: number | string } & React.ComponentProps<"div">) => (
	<div
		className={styles.subcomponent}
		style={{
			flex: `1 1 ${
				width && typeof width === "string" ? width : width + "px"
			}`,
		}}
		{...props}
	/>
);

const HeaderSubcomponent = ({
	width,
	...props
}: { width?: number | string } & React.ComponentProps<
	typeof TableColumnHeader
>) => (
	<TableColumnHeader
		className={styles.subcomponent}
		style={{
			flex: `1 1 ${
				width && typeof width === "string" ? width : width + "px"
			}`,
		}}
		{...props}
	/>
);

const renderHeaderCellStacked1 = (props: HeaderCellRendererProps) => (
	<>
		<FlexRow>
			<HeaderSubcomponent
				{...props}
				width={70}
				dataKey="CID"
				label="CID"
				//dropdownWidth={400}
				customFilterElement=<IdFilter
					selectors={commentsSelectors}
					actions={commentsActions}
					dataKey="CID"
				/>
			/>
			<HeaderSubcomponent
				{...props}
				width={40}
				dataKey="Category"
				label="Cat" /*dropdownWidth={140}*/
			/>
			<HeaderSubcomponent
				{...props}
				width={30}
				dataKey="MustSatisfy"
				label="MBS"
			/>
		</FlexRow>
		<FlexRow>
			<HeaderSubcomponent
				{...props}
				width={70}
				dataKey="Clause"
				label="Clause" /*dropdownWidth={200}*/
			/>
			<HeaderSubcomponent
				{...props}
				width={40}
				dataKey="Page"
				label="Page" /*dataRenderer={renderPage} dropdownWidth={150}*/
			/>
		</FlexRow>
		<FlexRow>
			<HeaderSubcomponent
				{...props}
				width={90}
				dataKey="CommenterName"
				label="Commenter" /*dropdownWidth={300}*/
			/>
			<HeaderSubcomponent
				{...props}
				width={30}
				dataKey="Vote"
				label="Vote"
			/>
		</FlexRow>
	</>
);

const renderDataCellStacked1 = ({
	rowData,
}: {
	rowData: CommentResolution;
}) => {
	return (
		<>
			<FlexRow>
				<DataSubcomponent width={70} style={{ fontWeight: "bold" }}>
					{rowData.CID /*getCID(rowData)*/}
				</DataSubcomponent>
				<DataSubcomponent width={40}>
					{renderCategory(rowData)}
				</DataSubcomponent>
				<DataSubcomponent width={30}>
					{renderMBS(rowData)}
				</DataSubcomponent>
			</FlexRow>
			<FlexRow>
				<DataSubcomponent width={70} style={{ fontStyle: "italic" }}>
					{rowData.Clause}
				</DataSubcomponent>
				<DataSubcomponent width={40}>
					{renderPage(rowData.Page)}
				</DataSubcomponent>
			</FlexRow>
			<FlexRow>{renderCommenter(rowData)}</FlexRow>
		</>
	);
};

const renderHeaderCellStacked2 = (props: HeaderCellRendererProps) => (
	<>
		<HeaderSubcomponent
			{...props}
			dataKey="AssigneeName"
			label="Assignee"
		/>
		<HeaderSubcomponent
			{...props}
			dataKey="Submission"
			label="Submission"
		/>
	</>
);

function renderDataCellStacked2({ rowData }: { rowData: CommentResolution }) {
	const { groupName } = useAppSelector(selectBallotsState);
	return (
		<>
			<div>{rowData.AssigneeName}</div>
			<div>{renderSubmission(groupName, rowData["Submission"])}</div>
		</>
	);
}

const renderHeaderCellStacked3 = (props: HeaderCellRendererProps) => (
	<>
		<HeaderSubcomponent {...props} dataKey="AdHoc" label="Ad-hoc" />
		<HeaderSubcomponent
			{...props}
			dataKey="CommentGroup"
			label="Comment Group" /*dropdownWidth={300}*/
		/>
	</>
);

const renderDataCellStacked3 = ({
	rowData,
}: {
	rowData: CommentResolution;
}) => (
	<>
		<div>{rowData["AdHoc"] || ""}</div>
		<div>{rowData["CommentGroup"] || ""}</div>
	</>
);

const renderHeaderCellResolution = ({
	column,
	...props
}: HeaderCellRendererProps) => (
	<>
		<HeaderSubcomponent
			{...props}
			dataKey="ResnStatus"
			label="Resolution Status"
			/*dropdownWidth={150}*/ column={{
				...column,
				dataRenderer: resnStatusRenderer,
			}}
		/>
		<HeaderSubcomponent
			{...props}
			dataKey="Resolution"
			label="Resolution"
			column={{ ...column, dataRenderer: renderHtmlAsText }}
		/>
	</>
);

export const tableColumns: (ColumnProperties & { width: number })[] = [
	{
		key: "__ctrl__",
		width: 48,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => (
			<SelectExpandHeaderCell
				customSelectorElement=<IdSelector
					style={{ width: 200 }}
					selectors={commentsSelectors}
					actions={commentsActions}
					dataKey="CID"
					focusOnMount
				/>
				{...p}
			/>
		),
		cellRenderer: (p) => (
			<SelectExpandCell
				selectors={commentsSelectors}
				actions={commentsActions}
				{...p}
			/>
		),
	},
	{
		key: "Stack1",
		label: "CID/Cat/MBS/...",
		width: 200,
		flexGrow: 1,
		flexShrink: 0,
		headerRenderer: renderHeaderCellStacked1,
		cellRenderer: renderDataCellStacked1,
	},
	{
		key: "CID",
		...fields.CID,
		width: 60,
		flexGrow: 1,
		flexShrink: 0,
		dropdownWidth: 400,
	},
	{
		key: "CommenterName",
		...fields.CommenterName,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{ key: "Vote", ...fields.Vote, width: 50, flexGrow: 1, flexShrink: 1 },
	{
		key: "MustSatisfy",
		...fields.MustSatisfy,
		width: 36,
		flexGrow: 1,
		flexShrink: 0,
		cellRenderer: ({ rowData }: { rowData: CommentResolution }) =>
			renderMBS(rowData),
	},
	{
		key: "Category",
		...fields.Category,
		width: 36,
		flexGrow: 1,
		flexShrink: 0,
	},
	{ key: "Clause", ...fields.Clause, width: 100, flexGrow: 1, flexShrink: 0 },
	{
		key: "Page",
		...fields.Page,
		width: 80,
		flexGrow: 1,
		flexShrink: 0,
		dataRenderer: renderPage,
		cellRenderer: ({ rowData, dataKey }) => renderPage(rowData[dataKey]),
	},
	{
		key: "Comment",
		...fields.Comment,
		width: 400,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData, dataKey }) =>
			renderTextBlock(rowData[dataKey]),
	},
	{
		key: "ProposedChange",
		...fields.ProposedChange,
		width: 400,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData, dataKey }) =>
			renderTextBlock(rowData[dataKey]),
	},
	{
		key: "Stack2",
		label: "Ad Hoc/Group",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderCellStacked3,
		cellRenderer: renderDataCellStacked3,
	},
	{ key: "AdHoc", ...fields.AdHoc, width: 100, flexGrow: 1, flexShrink: 1 },
	{
		key: "CommentGroup",
		...fields.CommentGroup,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 300,
	},
	{
		key: "Notes",
		...fields.Notes,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 300,
		dataRenderer: renderHtmlAsText,
		cellRenderer: ({ rowData }: { rowData: CommentResolution }) =>
			rowData.Notes && (
				<div
					className={styles.editor}
					dangerouslySetInnerHTML={{ __html: rowData.Notes }}
				/>
			),
	},
	{
		key: "Stack3",
		label: "Assignee/Submission",
		width: 250,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderCellStacked2,
		cellRenderer: renderDataCellStacked2,
	},
	{
		key: "AssigneeName",
		...fields.AssigneeName,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "Submission",
		...fields.Submission,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 300,
	},
	{
		key: "Status",
		...fields.Status,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 250,
	},
	{
		key: "ApprovedByMotion",
		...fields.ApprovedByMotion,
		width: 80,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 200,
	},
	{
		key: "Resolution",
		label: "Resolution",
		width: 400,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderCellResolution,
		cellRenderer: renderDataCellResolution,
	},
	{
		key: "Editing",
		label: "Editing",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderCellEditing,
		cellRenderer: renderDataCellEditing,
	},
];

const defaultAssignColumns = [
	"__ctrl__",
	"Stack1",
	"Comment",
	"ProposedChange",
	"Stack2",
	"Stack3",
	"Status",
];
const defaultResolveColumns = [
	...defaultAssignColumns,
	"ApprovedByMotion",
	"Resolution",
];
const defaultEditColumns = [...defaultResolveColumns, "Editing"];

const getDefaultColumnsConfig = (shownKeys: string[]) => {
	const columnConfig: Record<string, ChangeableColumnProperties> = {};
	for (const column of tableColumns) {
		columnConfig[column.key] = {
			unselectable: column.key.startsWith("__"),
			width: column.width,
			shown: shownKeys.includes(column.key),
		};
	}
	return columnConfig;
};

const getDefaultTableConfig = (shownKeys: string[]) => {
	const fixed = window.matchMedia("(max-width: 768px)").matches
		? true
		: false;
	const columns = getDefaultColumnsConfig(shownKeys);
	return { fixed, columns };
};

export const defaultTablesConfig = {
	Assign: getDefaultTableConfig(defaultAssignColumns),
	Resolve: getDefaultTableConfig(defaultResolveColumns),
	Edit: getDefaultTableConfig(defaultEditColumns),
};

export function commentsRowGetter({ rowIndex, ids, entities }: RowGetterProps) {
	let comment = entities[ids[rowIndex]];
	comment = {
		...comment,
		Status: getCommentStatus(comment),
	};
	if (rowIndex === 0) return comment;
	const prevComment = entities[ids[rowIndex - 1]];
	if (comment.CommentID !== prevComment.CommentID) return comment;
	// Previous row holds the same comment
	return {
		...comment,
		CommenterName: "",
		Vote: "",
		MustSatisfy: "",
		Category: "",
		Clause: "",
		Page: "",
		Comment: "",
		ProposedChange: "",
	};
}
