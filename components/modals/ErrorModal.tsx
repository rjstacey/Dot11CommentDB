import * as React from "react";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import { clearOne, clearAll, selectErrors, ErrorMsg } from "../store/error";

import styles from "./index.module.css";

function MultipleErrorForm({ errors }: { errors: ErrorMsg[] }) {
	const dispatch = useDispatch();
	const [index, setIndex] = React.useState<number>(0);

	if (errors.length === 0) return null;

	const n = index > errors.length - 1 ? errors.length - 1 : index;

	function next() {
		if (n < errors.length) setIndex(n + 1);
	}
	function prev() {
		if (index > 0) setIndex(n - 1);
	}
	const error = errors[n];

	const dismissOneButton = (
		<Button onClick={() => dispatch(clearOne(n))}>Dismiss</Button>
	);
	const dismissAllButton = (
		<Button onClick={() => dispatch(clearAll())}>Dismiss All</Button>
	);
	const dismissActions =
		errors.length > 1 ? (
			<>
				<Button
					//className={styles["nav-icon"]}
					className="bi-arrow-left-circle"
					onClick={prev}
				/>
				<div className={styles["dismiss-buttons-stack"]}>
					{dismissOneButton}
					{dismissAllButton}
				</div>
				<Button className="bi-arrow-right-circle" onClick={next} />
			</>
		) : (
			dismissOneButton
		);

	return (
		<>
			<Modal.Header>
				<Modal.Title>{error.summary}</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				{errors.length > 1 && (
					<div className={styles["error-count"]}>
						{n + 1} of {errors.length} errors
					</div>
				)}

				{error.detail &&
					error.detail.split("\n").map((s, i) => <p key={i}>{s}</p>)}
			</Modal.Body>
			<Modal.Footer>{dismissActions}</Modal.Footer>
		</>
	);
}

function ErrorModal() {
	const dispatch = useDispatch();
	const errors = useSelector(selectErrors);

	return (
		<Modal show={errors.length > 0} onHide={() => dispatch(clearAll())}>
			<MultipleErrorForm errors={errors} />
		</Modal>
	);
}

export default ErrorModal;
