import * as React from "react";
import ExpandingTextArea from "react-expanding-textarea";
import styles from "./form.module.css";

const TextArea = React.forwardRef<
	HTMLTextAreaElement,
	React.ComponentProps<typeof ExpandingTextArea>
>(({ className, ...props }, ref) => (
	<ExpandingTextArea
		ref={ref}
		className={styles.textarea + (className ? " " + className : "")}
		{...props}
	/>
));

export default TextArea;
