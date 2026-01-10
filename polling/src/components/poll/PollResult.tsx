import type { Poll } from "@/store/pollingAdmin";

export function PollResult({ poll }: { poll: Poll }) {
	if (poll.resultsSummary === null) return null;
	const resultsSummary = poll.resultsSummary;

	if (poll.type === "m") {
		const [y, n, a] = resultsSummary;
		const approvalRate = (y / (y + n)) * 100;
		return (
			<span>
				{`Y: ${y}, N: ${n}, A: ${a} (${approvalRate.toFixed(1)}%)`}
			</span>
		);
	} else {
		const r = poll.options.map(
			(option, i) => `${option}: ${resultsSummary[i] || 0}`
		);
		return <span>{r.join(", ")}</span>;
	}
}
