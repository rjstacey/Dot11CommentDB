import * as React from "react";
import styles from "./form.module.css";

const ButtonGroup = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={styles["button-group"] + (className ? " " + className : "")}
		{...props}
	/>
);

export default ButtonGroup;
