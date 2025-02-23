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
		g.selectAll("*").remove();
		g.attr("font-size", "1em");
		g.call(d3.axisBottom(scale))
			.append("text")
			.attr("x", "50%")
			.attr("y", 40)
			.attr("fill", "black")
			.attr("anchor", "middle")
			.text(label);
		setHeigth?.(Math.ceil(ref.current!.getBBox().height * 10) / 10);
	}, [scale, label]);
	return <g ref={ref} transform={`translate(${x}, ${y})`} />;
}
