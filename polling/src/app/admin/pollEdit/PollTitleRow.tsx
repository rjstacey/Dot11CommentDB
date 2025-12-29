import css from "./PollEdit.module.css";

export function PollTitleRow({
	value,
	onChange,
	disabled,
}: {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	return (
		<div className={css.pollTitleRow}>
			<div className={css.pollTitle}>
				<input
					id="poll-title"
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
				/>
			</div>
		</div>
	);
}
