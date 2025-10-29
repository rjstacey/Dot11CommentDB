import { Link } from "react-router";
import { useAppSelector } from "@/store/hooks";
import {
	getEncodedBallotId,
	selectBallotsAccess,
	BallotType,
	Ballot,
	AccessLevel,
} from "@/store/ballots";

export function BallotResults({ ballot }: { ballot: Ballot }) {
	const access = useAppSelector(selectBallotsAccess);
	const results = ballot.Results;
	let str = "";
	if (ballot.Type === BallotType.CC) {
		const commenters = results?.Commenters || 0;
		str = `${commenters} commenters`;
	} else {
		if (results && results.TotalReturns) {
			str = `${results.Approve}/${results.Disapprove}/${results.Abstain}`;
			const p =
				(100 * results.Approve) /
				(results.Approve + results.Disapprove);
			if (!isNaN(p)) str += ` (${p.toFixed(1)}%)`;
		}
		if (!str) str = "None";
	}
	return access >= AccessLevel.admin ? (
		<Link to={`../results/${getEncodedBallotId(ballot)}`}>{str}</Link>
	) : (
		<>{str}</>
	);
}
