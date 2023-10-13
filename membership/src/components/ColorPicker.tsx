import styled from "@emotion/styled";

const defaultOptions = [
	"red",
	"cyan",
	"#9AFEFF",
	"DarkBlue",
	"purple",
	"yellow",
	"lime",
	"#6CC417",
	"magenta",
	"pink",
	"silver",
	"orange",
	"brown",
	"maroon",
	"green",
	"#46C7C7",
	"olive",
	"aquamarine",
	"#728FCE",
	"Turquoise",
	"#FFDB58",
	"#FFE5B4",
	"#FF69B4",
	"#86608E",
	"#FAF0DD",
];

const Container = styled.div`
	background: rgb(255, 255, 255);
	border: 1px solid rgba(0, 0, 0, 0.2);
	//box-shadow: rgb(0 0 0 / 15%) 0px 3px 12px;
	border-radius: 4px;
	padding: 5px;
	display: flex;
	flex-wrap: wrap;
`;

const outline =
	"z-index: 2; outline: white solid 2px; box-shadow: rgb(0, 0, 0, 0.25) 0 0 5px 2px;";

const ColorBox = styled.div<{ isSelected: boolean; readOnly: boolean }>`
	position: relative;
	width: 25px;
	height: 25px;
	outline: none;
	${({ isSelected }) => (isSelected ? outline : undefined)}
	${({ readOnly }) =>
		readOnly ? undefined : `cursor: pointer; :hover {${outline}}`}
`;

function ColorPicker({
	value,
	onChange = () => {},
	options = defaultOptions,
	readOnly = false,
}: {
	value: string | null;
	onChange?: (value: string | null) => void;
	options?: string[];
	readOnly?: boolean;
}) {
	return (
		<Container>
			{options.map((v) => (
				<ColorBox
					key={v}
					onClick={readOnly ? undefined : () => onChange(v)}
					style={{ background: v }}
					isSelected={v === value}
					readOnly={readOnly}
				/>
			))}
		</Container>
	);
}

export default ColorPicker;
