import css from "./toggle.module.css";

function LabeledToggle<V = string>({
	className,
	label,
	value,
	onChange,
	options,
	disabled,
	buttonRef,
}: {
	className?: string;
	label: string;
	value: V;
	onChange: (value: V) => void;
	options: { label: string; value: V }[];
	disabled?: boolean;
	buttonRef?: (ref: HTMLButtonElement | null) => void;
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

	const id = `toggle-${label}`;

	return (
		<div className={css.toggle + (className ? " " + className : "")}>
			<label htmlFor={id}>{label}</label>
			<button
				id={id}
				ref={buttonRef}
				style={{ position: "relative", cursor: "pointer" }}
				onClick={toggle}
				disabled={disabled}
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
