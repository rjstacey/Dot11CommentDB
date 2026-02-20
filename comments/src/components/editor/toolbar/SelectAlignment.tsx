import { DropdownButton, Button } from "react-bootstrap";
import { useAlignmentSelect, type AlignmentFormat } from "../useAlignmentEdit";

export type AlignmentOption = {
	value: AlignmentFormat | null;
	label: string;
	icon: string;
	disabled?: boolean;
};

const options: AlignmentOption[] = [
	{ value: "left", label: "Left Align", icon: "bi-text-left" },
	{ value: "center", label: "Center Align", icon: "bi-text-center" },
	{ value: "right", label: "Right Align", icon: "bi-text-right" },
	{ value: "justify", label: "Justify Align", icon: "bi-justify" },
	{ value: null, label: "", icon: "", disabled: true },
	{ value: "indent", label: "Indent", icon: "bi-text-indent-left" },
	{ value: "outdent", label: "Outdent", icon: "bi-text-indent-right" },
];

export function SelectAlignment({ disabled }: { disabled?: boolean }) {
	const { value, onChange } = useAlignmentSelect();
	return (
		<DropdownButton
			title={<i className="bi-text-left" />}
			align="end"
			disabled={disabled}
		>
			<div className="button-group">
				{options.map((o, i) =>
					o.value ? (
						<Button
							key={i}
							className={value === o.value ? "active" : undefined}
							onClick={() => onChange(o.value!)}
						>
							<i className={o.icon} />
						</Button>
					) : (
						<div className="vertical-divider" key={i} />
					),
				)}
			</div>
		</DropdownButton>
	);
}
