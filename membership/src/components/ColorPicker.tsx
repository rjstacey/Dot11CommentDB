import css from "./ColorPicker.module.css";

const colors = [
	"#f44336",
	"#e91e63",
	"#c43fdb",
	"#986de3",
	"#3f51b5",
	"#2196f3",
	"#03a9f4",
	"#00bcd4",
	"#009688",
	"#4caf50",
	"#8bc34a",
	"#cddc39",
	"#ffeb3b",
	"#ffc107",
	"#ff9800",
	"#ff5722",
	"#795548",
	"#607d8b",
	"#c0c0c0",
	"#ff00ff",
	"#ff69b4",
	"#ffc0cb",
];

function ColorCircle({
	color,
	isSelected,
	onClick,
	readOnly,
}: {
	color: string;
	isSelected: boolean;
	onClick?: () => void;
	readOnly?: boolean;
}) {
	const boxShadow = `${color} 0 0 0 ${isSelected ? "3px" : "12px"} inset`;
	let cn = css["outside"];
	if (readOnly) cn += ` ${css["readonly"]}`;
	return (
		<div className={cn} onClick={readOnly ? undefined : onClick}>
			<div className={css["inside"]} style={{ boxShadow }} />
		</div>
	);
}

export function ColorPicker({
	id,
	value,
	onChange,
	readOnly,
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<div
				className={css["color-picker"]}
				aria-label="Color picker"
				id={id}
			>
				{colors.map((color) => (
					<ColorCircle
						key={color}
						color={color}
						isSelected={value === color}
						onClick={() => onChange(color)}
						readOnly={readOnly}
					/>
				))}
			</div>
		</>
	);
}

export default ColorPicker;
