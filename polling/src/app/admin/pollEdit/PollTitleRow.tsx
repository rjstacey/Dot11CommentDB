import css from "@/components/poll-layout.module.css";

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
		<div className={css["poll-title-row"]}>
			<div className={css["poll-title"]}>
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
