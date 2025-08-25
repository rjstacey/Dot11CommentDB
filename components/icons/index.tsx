import React from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import styles from "./icons.module.css";

import { ActionIcon } from "./ActionIcon";

export { ActionIcon };

export const IconCollapse = ({
	isCollapsed,
	className,
	...props
}: { isCollapsed: boolean } & React.ComponentProps<"i">) => (
	<i
		className={
			(isCollapsed ? "bi-plus-square" : "bi-dash-square") +
			(className ? " " + className : "")
		}
		{...props}
	/>
);

const SvgCaretRight = ({
	className,
	...props
}: React.SVGProps<SVGSVGElement>) => (
	<svg
		className={styles["svg-icon"] + (className ? " " + className : "")}
		role="img"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 40 40"
		{...props}
	>
		<path
			d="M 10 10 L 10 30 L 20 20 Z"
			stroke="currentColor"
			fill="currentColor"
			strokeWidth="4"
		/>
	</svg>
);

const SvgCaretDown = ({ style, ...props }: React.SVGProps<SVGSVGElement>) => (
	<SvgCaretRight
		style={{ ...style, transform: "rotate(90deg)" }}
		{...props}
	/>
);

const SvgDoubleCaretRight = ({
	className,
	...props
}: React.SVGProps<SVGSVGElement>) => (
	<svg
		className={styles["svg-icon"] + (className ? " " + className : "")}
		role="img"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 40 40"
		{...props}
	>
		<path
			d="M 10 10 L 10 30 L 20 20 Z M 20 10 L 20 30 L 30 20 Z"
			stroke="currentColor"
			fill="currentColor"
			strokeWidth="4"
		/>
	</svg>
);

const SvgDoubleCaretDown = ({
	style,
	...props
}: React.SVGProps<SVGSVGElement>) => (
	<SvgDoubleCaretRight
		style={{ ...style, transform: "rotate(90deg)" }}
		{...props}
	/>
);

const SvgObjectGroup = ({
	className,
	...props
}: React.SVGProps<SVGSVGElement>) => (
	<svg
		className={styles["svg-icon"] + (className ? " " + className : "")}
		role="img"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 512 512"
		{...props}
	>
		<path
			fill="currentColor"
			d="M480 128V96h20c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v20H64V44c0-6.627-5.373-12-12-12H12C5.373 32 0 37.373 0 44v40c0 6.627 5.373 12 12 12h20v320H12c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12v-20h384v20c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-20V128zM96 276V140c0-6.627 5.373-12 12-12h168c6.627 0 12 5.373 12 12v136c0 6.627-5.373 12-12 12H108c-6.627 0-12-5.373-12-12zm320 96c0 6.627-5.373 12-12 12H236c-6.627 0-12-5.373-12-12v-52h72c13.255 0 24-10.745 24-24v-72h84c6.627 0 12 5.373 12 12v136z"
		></path>
	</svg>
);

const SvgVoteYes = ({
	style,
	className,
	...props
}: React.SVGProps<SVGSVGElement>) => (
	<svg
		style={{ ...style, transform: "translate(0, 3px)" }}
		className={styles["svg-icon"] + (className ? " " + className : "")}
		role="img"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 600 600"
		{...props}
	>
		<path
			d="M 7.6885391,404.6142 C 7.6885391,404.6142 122.85389,534.30185 145.88696,587.27791 L 244.92916,587.27791 C 286.38869,460.59602 447.62018,158.16034 585.8186,52.208207 C 614.45182,15.394067 542.5208,0.19798715 484.4731,24.568517 C 396.98668,61.298507 231.98485,341.73657 201.16633,409.22081 C 157.4035,420.73735 111.33735,335.51499 111.33735,335.51499 L 7.6885391,404.6142 z "
			fill="#00bb00"
		/>
	</svg>
);

const SvgVoteNo = ({
	style,
	className,
	...props
}: React.SVGProps<SVGSVGElement>) => (
	<svg
		style={{ ...style, transform: "translate(0, 3px)" }}
		className={styles["svg-icon"] + (className ? " " + className : "")}
		role="img"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 525 600"
		{...props}
	>
		<path
			d="M 15.554399,499.23617 C 15.554399,489.88388 49.262003,442.92493 90.460178,394.88295 C 131.65835,346.84096 171.36188,300.19332 178.69024,291.22150 C 186.01860,282.24967 178.40699,230.17136 161.77557,175.49190 C 127.32187,62.217924 124.18126,24.551078 147.96473,9.8520875 C 180.47155,-10.238240 225.08409,19.441293 262.53181,86.070496 L 300.46929,153.57113 L 371.71241,83.651323 C 418.55713,37.676699 451.99662,17.200896 469.35551,23.862122 C 503.70070,37.041618 523.52158,88.613119 497.56689,97.264679 C 468.10720,107.08456 346.17818,292.63354 346.40950,327.29275 C 346.51902,343.70450 363.84370,387.26650 384.90880,424.09720 C 399.76671,450.07512 419.73824,470.57451 411.81016,484.66521 L 369.43018,559.98778 C 361.21065,574.59648 330.85012,535.64770 294.88494,497.84045 L 232.14649,431.88864 L 162.59445,514.37325 C 124.34083,559.73979 88.627185,596.62407 83.230792,596.33832 C 77.834411,596.05256 15.554399,508.58848 15.554399,499.23617 z "
			fill="#bb0000"
		/>
	</svg>
);

const SvgPeopleSlash = ({
	className,
	...props
}: React.SVGProps<SVGSVGElement>) => (
	<svg
		className={styles["svg-icon"] + (className ? " " + className : "")}
		role="img"
		xmlns="http://www.w3.org/2000/svg"
		fill="currentColor"
		viewBox="0 0 16 16"
	>
		<path
			d="
			M15 14
			s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1
			h8Zm-7.978-1
			A.261.261 0 0 1 7 12.996
			c.001-.264.167-1.03.76-1.72
			C8.312 10.629 9.282 10 11 10
			c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002
			a.274.274 0 0 1-.014.002
			H7.022Z
			M11 7
			a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z
			m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z
			M6.936 9.28a5.88 5.88 0 0 0-1.23-.247
			A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1
			h4.216A2.238 2.238 0 0 1 5 13
			c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z
			"
		/>
		<path
			d="M14 2 L1 15"
			stroke="white"
			stroke-width="1.5"
			stroke-linecap="round"
		/>
		<path
			d="M14 2 L1 15"
			stroke="currentColor"
			stroke-width="1"
			stroke-linecap="round"
		/>
	</svg>
);

export const icons: Record<string, string | React.FC> = {
	"vote-yes": SvgVoteYes,
	"vote-no": SvgVoteNo,
	"caret-right": SvgCaretRight,
	"caret-down": SvgCaretDown,
	"double-caret-right": SvgDoubleCaretRight,
	"double-caret-down": SvgDoubleCaretDown,
	"object-group": SvgObjectGroup,
	handle: "bi-chevron-down",
	refresh: "bi-arrow-repeat",
	undo: "bi-arrow-counterclockwise",

	redo: "bi-arrow-clockwise",
	copy: "bi-copy",
	edit: "bi-pencil",
	cancel: "bi-x-circle",
	ok: "bi-check-circle",
	next: "bi-arrow-right-circle",
	prev: "bi-arrow-left-circle",
	filter: "bi-funnel",
	"add-item": "bi-journal-plus",
	close: "bi-x-square",

	add: "bi-plus-lg",
	delete: "bi-trash",
	clear: "bi-x",

	"book-open": "bi-book",

	user: "bi-person",
	"user-check": "bi-person-check",
	"user-slash": "bi bi-person-slash",
	group: "bi bi-people",
	"group-slash": SvgPeopleSlash,

	envelope: "bi-envelope",
	send: "bi-send",
	calendar: "bi-calendar",
	columns: "bi-layout-three-columns",
	save: "bi-floppy",
	history: "bi-clock-history",

	import: "bi-cloud-upload",
	export: "bi bi-cloud-download",
	upload: "bi bi-upload",
	download: "bi-download",
	more: "bi-chevron-double-down",

	/* editing: inline styles */
	bold: "bi-type-bold",
	italic: "bi bi-type-italic",
	underline: "bi-type-underline",
	strikethrough: "bi-type-strikethrough",
	highlight: "bi-highlighter",
	link: "bi-link",

	/* editing: block styles */
	quote: "bi-blockquote-left",
	"unordered-list-item": "bi-list-ul",
	"ordered-list-item": "bi-list-ol",
	code: "bi-code",

	"text-left": "bi-text-left",
	"text-right": "bi-text-right",
	"text-center": "bi-text-center",
	"text-justify": "bi-justify",
	"text-indent-left": "bi-text-indent-left",
	"text-indent-right": "bi-text-indent-right",
};

export const availableIcons = Object.keys(icons);

type IconNameProps = {
	type?: string;
	name?: string;
};

export const Icon = ({
	type,
	name,
	...rest
}: IconNameProps & React.HTMLProps<HTMLElement>) => {
	name = name || type;
	if (!name) {
		console.warn("Icon requires name or type to be specified");
		return null;
	}
	let icon: string | React.FC = name.startsWith("bi-") ? name : icons[name];
	if (typeof icon === "string") {
		const { className, ...props } = rest;
		return (
			<i
				className={icon + (className ? " " + className : "")}
				{...props}
			/>
		);
	} else if (icon) {
		return icon(rest);
	}
	console.warn("Unknown icon: ", name);
	return null;
};

/*
export const ActionIcon = ({
	className,
	disabled,
	onClick,
	...rest
}: React.ComponentProps<typeof Icon>) => (
	<Icon
		className={(className ? className + " " : "") + "action-icon"}
		disabled={disabled}
		onClick={disabled ? undefined : onClick}
		{...rest}
	/>
);
*/

export const Spinner = ({
	className,
	...props
}: React.HTMLProps<HTMLDivElement>) => (
	<div
		className={styles.spinner + (className ? " " + className : "")}
		{...props}
	>
		<div></div>
		<div></div>
		<div></div>
		<div></div>
	</div>
);
