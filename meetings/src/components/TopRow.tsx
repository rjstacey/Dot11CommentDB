import React from "react";
import styles from "./TopRow.module.css";

const TopRow = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div className={styles.topRow + (className ? " " + className : "")} {...props} />
);

export default TopRow;
