import { Row, Col, Button } from "react-bootstrap";

export function SubmitCancelRow({
	submitLabel = "Submit",
	cancelLabel = "Cancel",
	cancel,
	disabled,
}: {
	submitLabel?: string;
	cancelLabel?: string;
	cancel: () => void;
	disabled?: boolean;
}) {
	return (
		<Row className="mt-4">
			<Col xs={6} className="d-flex justify-content-center">
				<Button variant="secondary" type="button" onClick={cancel}>
					{cancelLabel}
				</Button>
			</Col>
			<Col xs={6} className="d-flex justify-content-center">
				<Button type="submit" disabled={disabled}>
					{submitLabel}
				</Button>
			</Col>
		</Row>
	);
}
