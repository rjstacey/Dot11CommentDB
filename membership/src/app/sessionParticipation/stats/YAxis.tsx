import React from "react";
import * as d3 from "d3";

export function YAxis({
	scale,
	x = 0,
	y = 0,
	label,
	setWidth,
}: {
	scale: d3.ScaleLinear<number, number>;
	x?: number;
	y?: number;
	label: string;
	setWidth?: (width: number) => void;
}) {
	const ref = React.useRef<SVGGElement>(null);
	React.useEffect(() => {
		const g = d3.select(ref.current!);
		g.selectAll("*").remove();
		g.call(d3.axisLeft(scale)).attr("font-size", "1em");
		g.append("text")
			.attr("dy", "-40")
			.attr("dx", -scale.range()[0] / 2)
			.attr("transform", "rotate(-90)")
			.attr("fill", "black")
			.attr("text-anchor", "middle")
			.text(label);
		setWidth?.(Math.ceil(ref.current!.getBBox().width * 10) / 10);
	}, [scale]);
	return <g ref={ref} transform={`translate(${x}, ${y})`} />;
}
