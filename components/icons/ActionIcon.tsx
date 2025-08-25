import css from "./icons.module.css";

export function ActionIcon({ className, ...props }: React.ComponentProps<"i">) {
	let cn = css["action-icon"];
	if (className) cn += " " + className;
	return <i className={cn} {...props} />;
}
