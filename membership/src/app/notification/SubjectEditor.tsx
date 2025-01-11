import css from "./notification.module.css";

function SubjectEditor({
	value,
	onChange,
	readOnly,
}: {
	value: string;
	onChange: (value: string) => void;
	readOnly: boolean;
}) {
	const placeholder = readOnly ? "(Blank)" : "Subject";
	return (
		<div className={css.subjectContainer}>
			<input
				type="text"
				value={value}
				onChange={(e) => {
					onChange(e.target.value);
				}}
				placeholder={placeholder}
				readOnly={readOnly}
			/>
		</div>
	);
}

export default SubjectEditor;
