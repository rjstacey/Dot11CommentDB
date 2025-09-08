import React from "react";

import { useAppSelector } from "@/store/hooks";
import {
	getCommentStatus,
	commentStatusOrder,
	CommentResolution,
	getField,
	selectCommentIds,
	selectSyncedCommentEntities,
} from "@/store/comments";

export type Counts = { [Label: string]: string | number };

function statusComp(status1: string, status2: string) {
	let n1 = (commentStatusOrder as readonly string[]).indexOf(status1);
	if (n1 < 0) n1 = commentStatusOrder.length;
	let n2 = (commentStatusOrder as readonly string[]).indexOf(status2);
	if (n2 < 0) n2 = commentStatusOrder.length;
	return n1 - n2;
}

function countsByCategory(comments: CommentResolution[]): Counts {
	return {
		Total: comments.length,
		E: comments.filter((c) => c.Category === "E").length,
		T: comments.filter((c) => c.Category === "T").length,
		G: comments.filter((c) => c.Category === "G").length,
	};
}

function countsByStatus(
	statusSet: string[],
	comments: CommentResolution[]
): Counts {
	const entry: Counts = { Total: comments.length };
	for (const status of statusSet)
		entry[status || "(Blank)"] = comments.filter(
			(c) => getField(c, "Status") === status
		).length;
	return entry;
}

function commentsByCommenter(comments: CommentResolution[]) {
	const commentersSet = [
		...new Set(comments.map((c) => c.CommenterName)),
	].sort();
	const data: Counts[] = [];
	for (const name of commentersSet) {
		data.push({
			Commenter: name || "(Blank)",
			...countsByCategory(
				comments.filter((c) => c.CommenterName === name)
			),
		});
	}
	return data;
}

function commentsByAssignee(comments: CommentResolution[]) {
	const assigneeSet = [
		...new Set(comments.map((c) => c.AssigneeName)),
	].sort();
	const statusSet = [
		...new Set(comments.map((c) => getField(c, "Status") as string)),
	].sort(statusComp);
	const data: Counts[] = [];
	for (const name of assigneeSet) {
		const assigneeComments = comments.filter(
			(c) => c.AssigneeName === name
		);
		const entry: Counts = {
			Assignee: name || "(Blank)",
			...countsByStatus(statusSet, assigneeComments),
		};
		data.push(entry);
	}
	return data;
}

function commentsByAssigneeAndCommentGroup(comments: CommentResolution[]) {
	const assigneeSet = [
		...new Set(comments.map((c) => c.AssigneeName)),
	].sort();
	const statusSet = [
		...new Set(comments.map((c) => getField(c, "Status") as string)),
	].sort(statusComp);
	const data: Counts[] = [];
	for (const name of assigneeSet) {
		const assigneeComments = comments.filter(
			(c) => c.AssigneeName === name
		);
		const entry: Counts = {
			Assignee: name || "(Blank)",
			"Comment Group": "",
			...countsByStatus(statusSet, assigneeComments),
		};
		data.push(entry);
		const commentGroupsSet = [
			...new Set(assigneeComments.map((c) => c.CommentGroup)),
		].sort();
		for (const group of commentGroupsSet) {
			const entry = {
				Assignee: "",
				"Comment Group": group || "(Blank)",
				...countsByStatus(
					statusSet,
					assigneeComments.filter((c) => c.CommentGroup === group)
				),
			};
			data.push(entry);
		}
	}
	return data;
}

function commentsByAdHocAndCommentGroup(comments: CommentResolution[]) {
	const adhocSet = [...new Set(comments.map((c) => c.AdHoc))].sort();
	const statusSet = [
		...new Set(comments.map((c) => getField(c, "Status") as string)),
	].sort(statusComp);
	const data: Counts[] = [];
	for (const name of adhocSet) {
		const adhocComments = comments.filter((c) => c.AdHoc === name);
		const entry: Counts = {
			"Ad-Hoc": name || "(Blank)",
			"Comment Group": "",
			...countsByStatus(statusSet, adhocComments),
		};
		data.push(entry);
		const commentGroupsSet = [
			...new Set(adhocComments.map((c) => c.CommentGroup)),
		].sort();
		for (const group of commentGroupsSet) {
			const entry = {
				Assignee: "",
				"Comment Group": group || "(Blank)",
				...countsByStatus(
					statusSet,
					adhocComments.filter((c) => c.CommentGroup === group)
				),
			};
			data.push(entry);
		}
	}
	return data;
}

const commentsReport = {
	"Comments by Commenter": commentsByCommenter,
	"Comments by Assignee": commentsByAssignee,
	"Comments by Assignee and Comment Group": commentsByAssigneeAndCommentGroup,
	"Comments by Ad-Hoc and Comment Group": commentsByAdHocAndCommentGroup,
} as const;
export type Report = keyof typeof commentsReport;
export const reports = Object.keys(commentsReport) as Report[];

export function useReportData(report: Report | null) {
	const ids = useAppSelector(selectCommentIds);
	const entities = useAppSelector(selectSyncedCommentEntities);

	const data: Counts[] = React.useMemo(() => {
		if (!report) return [];
		const comments = ids.map((id) => {
			const c = entities[id]!;
			return {
				...c,
				Status: getCommentStatus(c),
			};
		});
		return commentsReport[report](comments);
	}, [ids, entities, report]);

	return data;
}
