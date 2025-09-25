import { Link } from "react-router";

import { getEncodedBallotId, Ballot } from "@/store/ballots";

export function BallotComments({ ballot }: { ballot: Ballot }) {
	const comments = ballot.Comments;
	const str =
		comments && comments.Count > 0
			? `${comments.CommentIDMin}-${comments.CommentIDMax} (${comments.Count})`
			: "None";
	return <Link to={`../comments/${getEncodedBallotId(ballot)}`}>{str}</Link>;
}
