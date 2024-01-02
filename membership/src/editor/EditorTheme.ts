import styles from "./email.module.css";

const theme = {
	ltr: styles.ltr,
	rtl: styles.rtl,
	paragraph: styles.paragraph,
	quote: styles.quote,
	heading: {
		h1: styles.h1,
		h2: styles.h2,
	},
	list: {
		nested: {
			listitem: styles["nested-listitem"],
		},
		ol: styles.ol,
		ul: styles.ul,
		listitem: "list-item", // styles["listitem"],
	},
	image: "editor-image",
	link: styles.link,
	text: {
		bold: styles.bold,
		italic: styles.italic,
		underline: styles.underline,
		strikethrough: styles.strikethrough,
		code: styles.code,
	},
	code: styles.code,
};

export default theme;
