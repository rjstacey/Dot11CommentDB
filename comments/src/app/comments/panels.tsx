import { cloneElement, useRef, useCallback, useMemo } from "react";
import clsx from "clsx";
import { ColumnResizer } from "@common";

export type PanelProps = { isVisible?: boolean } & React.HTMLProps<HTMLDivElement>;
export const Panel = ({ isVisible, ...props }: PanelProps) => <div {...props} />;

type PanelPropsWithIndex = PanelProps & {
	"data-panel-key"?: string;
};

export function Panels({
	widths,
	setWidths,
	children,
	className,
	...props
}: Omit<React.HTMLProps<HTMLDivElement>, "children"> & {
	children: React.ReactElement<PanelProps>[];
	widths: Record<string, number>;
	setWidths: (widths: Record<string, number>) => void;
}) {
	const ref = useRef<HTMLDivElement>(null);

	const keys = useMemo(() => children.filter((c) => c.props.isVisible).map((c) => c.key!), [children]);

	const onDrag = useCallback((targetKey: string, event: MouseEvent, { deltaX }: { x: number; deltaX: number }) => {
		const parent = ref.current as HTMLDivElement;
		const widths: Record<string, number> = {};
		const keys: string[] = [];
		let deltaWidth = 0;
		for (const child of parent.children) {
			const key = child.getAttribute("data-panel-key")!;
			const display = child.computedStyleMap().get("display")?.toString();
			if (key && display !== "none") {
				let width = child.getBoundingClientRect().width;
				if (key === targetKey) {
					width += deltaX;
					deltaWidth = deltaX;
				}
				else {
					width -= deltaWidth;
					deltaWidth = 0;
				}
				widths[key] = width;
				keys.push(key);
			}
		}
		setWidths(widths);
	}, [setWidths]);

	const content = useMemo(() => {
		const content: React.ReactElement[] = [];
		const numVisible = keys.length;

		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			const key = child.key as string;
			let style: React.CSSProperties;
			if (child.props.isVisible) {
				const width = widths[key];
				const basis = width ? `${width}px` : `${100 / numVisible}%`;
				style = {
					...child.props.style,
					flex: `1 1 ${basis}`,
					overflow: "hidden",
				};
			} else {
				style = { ...child.props.style, display: "none" };
			}
			content.push(cloneElement<PanelPropsWithIndex>(child, { key, style, "data-panel-key": key }));
			const hasVisibleAdjacent = Boolean(children.find((c, j) => j > i && c.props.isVisible));
			if (child.props.isVisible && hasVisibleAdjacent) {
				content.push(<ColumnResizer key={`resizer-${key}`} onDrag={(event, data) => onDrag(key, event, data)} />);
			}
		}
		return content;
	}, [keys, widths, children, onDrag]);

	return (
		<div
			ref={ref}
			className={clsx("d-flex flex-grow-1 w-100 overflow-hidden", className)}
			{...props}
		>
			{content}
		</div>
	);
}
