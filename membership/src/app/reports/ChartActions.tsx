import { Col, Button } from "react-bootstrap";
import { copyChartToClipboard, downloadChart } from "@/components/copyChart";

export function ChartActions() {
	return (
		<Col className="d-flex justify-content-end align-items-center gap-2">
			<Button
				variant="outline-primary"
				className="bi-copy"
				title="Copy chart to clipboard"
				onClick={() => copyChartToClipboard("#chart")}
			/>
			<Button
				variant="outline-primary"
				className="bi-cloud-download"
				title="Export chart"
				onClick={downloadChart}
			/>
		</Col>
	);
}
