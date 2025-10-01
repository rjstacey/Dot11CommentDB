import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import { selectCommentsRoleAccess, CommentResolution } from "@/store/comments";
import { selectGroupEntities } from "@/store/groups";
import { AccessLevel, selectUser } from "@/store/user";

export function useCommentsAccess(comments: CommentResolution[]) {
	const user = useAppSelector(selectUser);
	const access = useAppSelector(selectCommentsRoleAccess);
	const groupEntities = useAppSelector(selectGroupEntities);

	const [commentsAccess, setCommentsAccess] = React.useState<number>(
		AccessLevel.none
	);
	const [resolutionsAccess, setResolutionsAccess] = React.useState<number>(
		AccessLevel.none
	);

	React.useEffect(() => {
		/* User has read-write comments access if the user is an officer of the assigned ad-hoc */
		let commentsAccess = access;
		if (commentsAccess <= AccessLevel.ro) {
			const rw = comments.every((c) => {
				const group = c.AdHocGroupId
					? groupEntities[c.AdHocGroupId]
					: undefined;
				if (group) {
					const access =
						group.permissionsRaw?.comments || AccessLevel.none;
					if (access >= AccessLevel.rw) return true;
				}
				return false;
			});
			if (rw) commentsAccess = AccessLevel.rw;
		}
		setCommentsAccess(commentsAccess);

		/* User has read-write resolutions access if the user has been assigned the comment
		 * and the comment does not have an approved resolution. */
		let resolutionsAccess = commentsAccess;
		if (
			resolutionsAccess <= AccessLevel.ro &&
			comments.every(
				(c) => c.AssigneeSAPIN === user.SAPIN && !c.ApprovedByMotion
			)
		) {
			resolutionsAccess = AccessLevel.rw;
		}
		setResolutionsAccess(resolutionsAccess);
	}, [comments, groupEntities, access, user]);

	return [commentsAccess, resolutionsAccess];
}
