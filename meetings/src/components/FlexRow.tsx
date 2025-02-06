export const FlexRow = ({ style, ...props }: React.ComponentProps<"div">) => (
	<div
		style={{ ...style, display: "flex", alignItems: "center" }}
		{...props}
	/>
);
