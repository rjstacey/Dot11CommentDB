import { Row, Col, Button, Spinner } from "react-bootstrap";

export function SubmitCancelRow({
	submitLabel,
	busy,
	cancel,
	disabled,
}: {
	submitLabel: string;
	busy?: boolean;
	cancel?: () => void;
	disabled?: boolean;
}) {
	return (
		<Row className="mb-3">
			<Col xs={6} className="d-flex justify-content-center">
				<Button type="submit" disabled={disabled}>
					<Spinner size="sm" hidden={!busy} className="me-2" />
					{submitLabel}
				</Button>
			</Col>
			<Col xs={6} className="d-flex justify-content-center">
				<Button variant="secondary" onClick={cancel}>
					Cancel
				</Button>
			</Col>
		</Row>
	);
}
