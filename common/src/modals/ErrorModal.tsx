import * as React from "react";
import { Modal, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import { clearOne, clearAll, selectErrors, ErrorMsg } from "../store/error";

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
		<Button variant="secondary" onClick={() => dispatch(clearAll())}>
			Dismiss All
		</Button>
	);
	const dismissActions =
		errors.length > 1 ? (
			<div className="d-flex justify-content-between w-100">
				<Button
					variant="light"
					className="bi-arrow-left-circle fs-2"
					onClick={prev}
				/>
				<div className="d-flex flex-column gap-2">
					{dismissOneButton}
					{dismissAllButton}
				</div>
				<Button
					variant="light"
					className="bi-arrow-right-circle fs-2"
					onClick={next}
				/>
			</div>
		) : (
			<div className="d-flex justify-content-around w-100">
				{dismissOneButton}
			</div>
		);

	const detail = error.detail.split("\n").map((s, i) => (
		<>
			<span key={i}>{s.replace(/ /g, "\u00A0")}</span>
			<br />
		</>
	));
	return (
		<>
			<Modal.Header className="flex-column">
				<Modal.Title>{error.summary}</Modal.Title>
				{errors.length > 1 && (
					<div className="d-flex justify-content-end w-100 text-muted">
						<span>
							{n + 1} of {errors.length} errors
						</span>
					</div>
				)}
			</Modal.Header>
			<Modal.Body>{detail}</Modal.Body>
			<Modal.Footer className="justify-content-between">
				{dismissActions}
			</Modal.Footer>
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
