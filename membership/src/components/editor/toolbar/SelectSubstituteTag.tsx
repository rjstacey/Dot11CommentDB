import { DropdownButton, DropdownItem } from "react-bootstrap";
import { useSubstitutionTagEdit } from "../useSubstitutionTagEdit";

export function SelectSubstituteTag({
	tags,
	disabled,
}: {
	tags: string[];
	disabled?: boolean;
}) {
	const { value, onChange } = useSubstitutionTagEdit();

	return (
		<DropdownButton
			title={"Substitution Tag"}
			align="end"
			drop="up"
			disabled={disabled}
		>
			{tags.map((tag, i) => (
				<DropdownItem
					key={i}
					className={value === tag ? "active" : undefined}
					onClick={() => onChange(tag)}
				>
					{tag}
				</DropdownItem>
			))}
		</DropdownButton>
	);
}
