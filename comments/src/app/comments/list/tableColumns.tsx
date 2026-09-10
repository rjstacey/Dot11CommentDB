import {
	SelectExpandHeaderCell,
	SelectExpandCell,
	TableColumnHeader,
	IdSelector,
	IdFilter,
	ColumnProperties,
	HeaderCellRendererProps,
	CellRendererProps,
	RowGetterProps,
	ChangeableColumnProperties,
} from "@common";

import {
	CommentMBS,
	renderCommenter,
	CommentCategory,
} from "../details/edit/CommentBasics";
import { renderSubmission } from "../details/edit/SubmissionSelect";
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

import "./tableColumns.css";
import { useMemo } from "react";

const FlexRow = (props: React.ComponentProps<"div">) => (
	<div className="d-flex" {...props} />
);

const renderPage = (page: string | number | null) =>
	typeof page === "number" ? page.toFixed(2) : page;

const renderTextBlock = (value: string) => {
	if (!value) return "";
	return (
		<div className="text-block-container">
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

const renderDataCellEditing = ({ rowData }: CellRendererProps) => (
	<>
		{rowData.EditStatus === "I" && <span>In D{rowData.EditInDraft}</span>}
		{rowData.EditStatus === "N" && <span>No change</span>}
		{rowData.EditNotes && (
			<div
				className="editor-style"
				dangerouslySetInnerHTML={{ __html: rowData.EditNotes }}
			/>
		)}
	</>
);

const resnStatusRenderer = (resnStatus: ResnStatusType | null) =>
	resnStatus ? resnStatusMap[resnStatus] : "";

function renderDataCellResolution({ rowData }: { rowData: CommentResolution }) {
	const resnStatus = rowData["ResnStatus"];

	let className = "resolution-container" + " editor-style";
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
		className="column-subcomponent"
		style={{
			flex: `1 1 ${width && typeof width === "string" ? width : width + "px"
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
		className="column-subcomponent"
		style={{
			flex: `1 1 ${width && typeof width === "string" ? width : width + "px"
				}`,
		}}
		{...props}
	/>
);

function getStack1Renderers({ actions, selectors }: { actions: typeof commentsActions; selectors: typeof commentsSelectors }) {
	return {
		headerRenderer(props: HeaderCellRendererProps) {
			return (
				<>
					<FlexRow>
						<HeaderSubcomponent
							{...props}
							width={70}
							dataKey="CID"
							label="CID"
							//dropdownWidth={400}
							customFilterElement={(
								<IdFilter
									selectors={selectors}
									actions={actions}
									dataKey="CID"
								/>)}
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
		},
		cellRenderer({ rowData }: CellRendererProps) {
			return (
				<>
					<FlexRow>
						<DataSubcomponent width={70} style={{ fontWeight: "bold" }}>
							{rowData.CID /*getCID(rowData)*/}
						</DataSubcomponent>
						<DataSubcomponent width={40}>
							<CommentCategory comment={rowData} />
						</DataSubcomponent>
						<DataSubcomponent width={30}>
							<CommentMBS comment={rowData} />
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
		},
	}
}

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

function CommentSubmission({ submission }: { submission: string }) {
	const { groupName } = useAppSelector(selectBallotsState);
	return <div>{renderSubmission(groupName, submission)}</div>
}

function renderDataCellStacked2({ rowData }: { rowData: CommentResolution }) {
	return (
		<>
			<div>{rowData.AssigneeName || <>&nbsp;</>}</div>
			<CommentSubmission submission={rowData.Submission} />
		</>
	);
}

const renderHeaderCellStacked3 = (props: HeaderCellRendererProps) => (
	<>
		<HeaderSubcomponent {...props} dataKey="AdHoc" label="Ad-hoc" />
		<HeaderSubcomponent
			{...props}
			dataKey="CommentGroup"
			label="Comment Group"
		/*dropdownWidth={300}*/
		/>
	</>
);

const renderDataCellStacked3 = ({ rowData }: CellRendererProps) => (
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

function getControlColumnRenderers({ actions, selectors }: { actions: typeof commentsActions; selectors: typeof commentsSelectors }) {
	return {
		headerRenderer: (p: HeaderCellRendererProps) => (
			<SelectExpandHeaderCell
				customSelectorElement={
					<IdSelector
						style={{ width: 200 }}
						selectors={selectors}
						actions={actions}
						dataKey="CID"
						focusOnMount
					/>
				}
				{...p}
			/>
		),
		cellRenderer: (p: CellRendererProps) => (
			<SelectExpandCell
				selectors={selectors}
				actions={actions}
				{...p}
			/>
		),
	}
}

export const tableColumns: (ColumnProperties & { width: number })[] = [
	{
		key: "__ctrl__",
		width: 48,
		flexGrow: 0,
		flexShrink: 0,
	},
	{
		key: "Stack1",
		label: "CID/Cat/MBS/...",
		width: 200,
		flexGrow: 1,
		flexShrink: 0,
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
		key: "Category",
		...fields.Category,
		width: 36,
		flexGrow: 1,
		flexShrink: 0,
	},
	{
		key: "MustSatisfy",
		...fields.MustSatisfy,
		width: 36,
		flexGrow: 1,
		flexShrink: 0,
		cellRenderer: ({ rowData }: { rowData: CommentResolution }) => (
			<CommentMBS comment={rowData} />
		),
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
		key: "CommenterName",
		...fields.CommenterName,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{ key: "Vote", ...fields.Vote, width: 50, flexGrow: 1, flexShrink: 1 },
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
		key: "Status",
		...fields.Status,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 250,
	},
	{
		key: "Stack2",
		label: "Ad Hoc/Group",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderHeaderCellStacked3,
		cellRenderer: renderDataCellStacked3,
		dropdownWidth: 300,
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
					className="editor-style"
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
		cellRenderer: ({ rowData }: { rowData: CommentResolution }) => <CommentSubmission submission={rowData.Submission} />
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

export const quickSelect = {
	CID: ["__ctrl__", "Stack1"],
	Comment: ["__ctrl__", "Stack1", "Comment", "ProposedChange"],
	Assign: ["__ctrl__", "Stack1", "Comment", "ProposedChange", "Status", "Stack2", "Stack3"],
	Resolve: ["__ctrl__", "Stack1", "Comment", "ProposedChange", "Status", "Stack3", "Resolution"],
	Edit: ["__ctrl__", "Stack1", "Comment", "ProposedChange", "Status", "Resolution", "Editing"],
}

const defaultColumns = quickSelect.Comment;

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
	default: getDefaultTableConfig(defaultColumns),
};

export function rowGetter({ rowIndex, ids, entities }: RowGetterProps) {
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

export function useTableColumns({ actions, selectors }: { actions: typeof commentsActions; selectors: typeof commentsSelectors }) {

	const columns = useMemo(() => tableColumns.map(c => {
		if (c.key === "__ctrl__") {
			return {
				...c,
				...getControlColumnRenderers({ actions, selectors }),
			};
		}
		if (c.key === "Stack1") {
			return {
				...c,
				...getStack1Renderers({ actions, selectors }),
			};
		}
		return c;
	}), [actions, selectors]);

	return {
		columns,
		rowGetter,
		defaultTablesConfig
	};
}
