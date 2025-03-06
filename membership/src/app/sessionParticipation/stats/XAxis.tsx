import React from "react";
import * as d3 from "d3";

export function XAxis({
	scale,
	x = 0,
	y = 0,
	label,
	setHeigth,
}: {
	scale: d3.ScaleBand<string>;
	x?: number;
	y?: number;
	label: string;
	setHeigth?: (height: number) => void;
}) {
	const ref = React.useRef<SVGGElement>(null);
	React.useEffect(() => {
		const g = d3.select(ref.current!);
		g.selectChildren().remove();
		g.call(d3.axisBottom(scale)).attr("font-size", null);
		g.selectAll(".tick text").attr("dy", "2em");
		g.selectAll("text.x-axis-label")
			.data([0])
			.enter()
			.append("text")
			.attr("class", "x-axis-label");
		g.select("text.x-axis-label")
			.attr("x", "50%")
			.attr("y", 60)
			.attr("fill", "black")
			.attr("anchor", "middle")
			.text(label);

		setHeigth?.(Math.ceil(ref.current!.getBBox().height * 10) / 10);
	}, [scale, label]);
	return <g ref={ref} transform={`translate(${x}, ${y})`} />;
}
