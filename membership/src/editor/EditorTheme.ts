import { css } from '@emotion/react';

import styles from "./EditorTheme.module.css";
console.log(styles);

export const editorCss = css`
	p, .paragraph {
		margin: 14px 0;
	}

	pre {
		background-color: #f3f3f3;
		font-family: "Inconsolata", "Menlo", "Consolas", monospace;
		font-size: 16px;
		margin: 14px 0;
		padding: 20px;
	}

	blockquote {
		font-family: 'TimesNewRoman', serif;
		margin: 10px 20px;
		padding: 0 0;
	}

	ul {
		font-family: 'TimesNewRoman', serif;
		list-style-type: "— "
	}

	ol {
		font-family: 'TimesNewRoman', serif;
		list-style-type: numeric
	}

	/* There shouldn't be margin outside the first/last blocks */
	p:first-of-type,
	blockquote:first-of-type,
	pre:first-of-type,
	ul:first-of-type,
	ol:first-of-type {
		margin-top: 0;
	}

	p:last-child,
	blockquote:last-child,
	pre:last-child,
	ul:last-child,
	ol:last-child {
		margin-bottom: 0;
	}

	b, .bold {
		font-weight: bold;
	}

	i, .italic {
		font-style: italic;
	}

	ins, .underline {
		color: blue;
		text-decoration: underline;
	}

	del, .strikethrough {
		color: red,
		text-decoration: line-through;
	}

	mark, .highlight {
		background-color: #faed27;
	}

	.ltr {
		text-align: left;
	}
	
	.rtl {
		text-align: right;
	}
`;

const theme = {
	//ltr: "ltr", //styles.ltr,
	//rtl: "rtl", //styles.rtl,
	//paragraph: styles["paragraph"],
	//quote: styles["quote"],
	heading: {
		h1: styles["heading-h1"],
		h2: styles["heading-h2"],
	},
	list: {
		nested: {
			listitem: styles["nested-listitem"],
		},
		//ol: styles["ordered-list"],
		//ul: styles["unordered-list"],
		listitem: "list-item", // styles["listitem"],
	},
	image: "editor-image",
	link: styles["link"],
	text: {
		bold: "bold",
		italic: "italic",
		//overflowed: styles["text-overflowed"],
		//hashtag: styles["text-hashtag"],
		underline: styles["text-underline"],
		strikethrough: styles["text-strikethrough"],
		underlineStrikethrough: styles["text-underlineStrikethrough"],
		code: styles["text-code"],
	},
	code: styles["code"],
};

export default theme;
