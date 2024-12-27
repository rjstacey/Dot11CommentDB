import cn from "./toggle.module.css";

function LabeledToggle<V = string>({
	className,
	label,
	value,
	onChange,
	options,
}: {
	className?: string;
	label: string;
	value: V;
	onChange: (value: V) => void;
	options: { label: string; value: V }[];
}) {
	const widestLabel = options.reduce(
		(w, o) => (o.label.length > w.length ? o.label : w),
		""
	);
	const i = options.findIndex((o) => o.value === value);
	const selectedLabel = i >= 0 ? options[i].label : "(Blank)";

	function toggle() {
		let ii = i + 1;
		if (ii >= options.length) ii = 0;
		onChange(options[ii].value);
	}

	return (
		<div className={cn.toggle + (className ? " " + className : "")}>
			<label>{label}</label>
			<button
				style={{ position: "relative", cursor: "pointer" }}
				onClick={toggle}
			>
				<span style={{ visibility: "hidden" }}>{widestLabel}</span>
				<span style={{ position: "absolute", left: 10 }}>
					{selectedLabel}
				</span>
			</button>
		</div>
	);
}

export default LabeledToggle;
