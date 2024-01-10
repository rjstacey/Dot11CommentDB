import { CirclePicker } from "react-color";

const ColorPicker = ({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) => (
	<CirclePicker
		width="unset"
		circleSize={22}
		circleSpacing={11}
		color={value}
		onChangeComplete={(color) => onChange(color.hex)}
		colors={[
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
		]}
	/>
);

export default ColorPicker;
