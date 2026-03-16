import { useDimensions } from "./useDimensions";

export function ChartWrapper({
	children,
}: {
	children: (p: { width: number; height: number }) => React.ReactElement;
}) {
	const { ref, width, height } = useDimensions();

	if (width === 0 || height === 0) children = () => <div />;

	return (
		<div
			style={{
				flex: 1,
				width: "100%",
				overflow: "hidden",
			}}
		>
			<div
				ref={ref}
				style={{
					position: "relative",
					maxHeight: "100%",
					maxWidth: "100%",
					aspectRatio: "16/9",
					objectFit: "cover",
					margin: "auto",
				}}
			>
				{children({ width, height })}
			</div>
		</div>
	);
}
