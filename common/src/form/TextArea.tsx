import { forwardRef, type ComponentProps } from "react";
import ExpandingTextArea from "react-expanding-textarea";

export const TextArea = forwardRef<
	HTMLTextAreaElement,
	ComponentProps<typeof ExpandingTextArea>
>(({ className, ...props }, ref) => (
	<ExpandingTextArea
		ref={ref}
		className={"form-control" + (className ? " " + className : "")}
		{...props}
	/>
));

export default TextArea;
