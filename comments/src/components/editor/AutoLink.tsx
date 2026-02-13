import React from "react";
import { useParams } from "react-router";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";

const URL_MATCHER =
	/((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

function urlMatcher(text: string) {
	const match = URL_MATCHER.exec(text);
	return (
		match && {
			index: match.index,
			length: match[0].length,
			text: match[0],
			url: match[0].startsWith("http") ? match[0] : `https://${match[0]}`,
		}
	);
}

const EMAIL_MATCHER =
	/(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

function emailMatcher(text: string) {
	const match = EMAIL_MATCHER.exec(text);
	return (
		match && {
			index: match.index,
			length: match[0].length,
			text: match[0],
			url: `mailto:${match[0]}`,
		}
	);
}

const DCN_MATCHER = /((\d{1,2})-){0,1}(\d{2})[-/](\d{1,4})([r-](\d{1,2}))*/;

function dcnMatcher(groupName: string, text: string) {
	let gg: string | null = null,
		yy: string | null = null,
		nnnn: string | null = null,
		rr: string | null = null,
		m: RegExpExecArray | null;
	// default group comes from groupName
	m = /\.\d{1,2}$/.exec(groupName);
	if (m) gg = ("0" + m[0].slice(1)).slice(-2);
	// gg-yy-nnnn-rr or gg-yy-nnnn"r"rr or yy-nnnn-rr or yy-nnnn"r"rr or yy-nnnn
	m = DCN_MATCHER.exec(text);
	if (m) {
		if (m[2]) gg = ("0" + m[2]).slice(-2);
		yy = ("0" + m[3]).slice(-2);
		nnnn = ("000" + m[4]).slice(-4);
		if (m[6]) rr = ("0" + m[6]).slice(-2);
		if (gg && yy && nnnn) {
			let dcn = `${gg}-${yy}-${nnnn}`;
			if (rr) dcn += `-${rr}`;
			return {
				index: m.index,
				length: m[0].length,
				text: m[0],
				url: `https://mentor.ieee.org/${groupName}/dcn/${yy}/${dcn}`,
			};
		}
	}
	return null;
}

const SUBMISSION_MATCHER = /[<[*]((submission)|(this document))[>\]*]/i;

function submissionMatcher(
	groupName: string,
	submission: string | null | undefined,
	text: string,
) {
	const m = SUBMISSION_MATCHER.exec(text);
	if (m && submission) {
		const match = dcnMatcher(groupName, submission);
		if (match) {
			return {
				index: m.index,
				length: m[0].length,
				text: match.url,
				url: match.url,
			};
		}
	}
	return null;
}

export default function AutoLink({
	submission,
}: {
	submission?: string | null;
}) {
	const groupName = useParams().groupName || "";
	const matchers = React.useMemo(
		() => [
			urlMatcher,
			emailMatcher,
			(text: string) => dcnMatcher(groupName, text),
			(text: string) => submissionMatcher(groupName, submission, text),
		],
		[groupName, submission],
	);
	return <AutoLinkPlugin matchers={matchers} />;
}
