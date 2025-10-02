import * as React from "react";
import ExpandingTextArea from "react-expanding-textarea";

const TextArea = React.forwardRef<
	HTMLTextAreaElement,
	React.ComponentProps<typeof ExpandingTextArea>
>(({ className, ...props }, ref) => (
	<ExpandingTextArea
		ref={ref}
		className={"form-control" + (className ? " " + className : "")}
		{...props}
	/>
));

export default TextArea;
