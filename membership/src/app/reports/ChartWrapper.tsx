import { Ratio } from "react-bootstrap";
import { useDimensions } from "./useDimensions";

export function ChartWrapper({
	children,
}: {
	children: (p: { width: number; height: number }) => React.ReactElement;
}) {
	const { ref, width, height } = useDimensions();

	if (width === 0 || height === 0) children = () => <div />;

	return (
		<Ratio ref={ref} aspectRatio="16x9" className="overflow-hidden m-3">
			{children({ width, height })}
		</Ratio>
	);
}
