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
		<Row className="mt-3">
			<Col xs={6} className="d-flex justify-content-center">
				<Button type="submit" disabled={disabled}>
					{submitLabel}
					<Spinner size="sm" hidden={!busy} className="ms-2" />
				</Button>
			</Col>
			<Col xs={6} className="d-flex justify-content-center">
				<Button variant="secondary" onClick={cancel}>
					{"Cancel"}
				</Button>
			</Col>
		</Row>
	);
}
