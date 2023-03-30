import React from 'react';

import { Col, Checkbox, displayDate } from 'dot11-components';

import { getField, Member, BallotSeriesType } from '../store/members';

import { EditTable as Table, TableColumn } from '../components/Table';


const voteSummary = (entry: BallotSeriesType) =>
	entry.Vote?
		entry.BallotID + '/' + entry.Vote + '/' + entry.CommentCount:
		'Did not vote';

const ballotSeriesParticipationColumns: TableColumn[] = [
	{key: 'Project', label: 'Project'},
	{key: 'BallotIDs', label: 'Ballot series'},
	{key: 'Start', label: 'Start', renderCell: (entry: BallotSeriesType) => displayDate(entry.Start)},
	{key: 'End', label: 'End', renderCell: (entry: BallotSeriesType) => displayDate(entry.End)},
	{key: 'VoteSummary', label: 'Last vote', renderCell: voteSummary},
	{key: 'Excused', label: 'Excused', styleCell: {justifyContent: 'center'}},
	{key: 'SAPIN', label: 'SA PIN'}
];

function MemberBallotParticipation({
	member,
	updateMember,
	readOnly
}: {
	member: Member;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const columns = React.useMemo(() => {

		function change(votingPoolId: string, field: string, value: any) {
			let newBallotSeriesParticipation = member.BallotSeriesParticipation.slice();
			const index = newBallotSeriesParticipation.findIndex(entry => entry.VotingPoolID === votingPoolId);
			if (index < 0) {
				console.error("Can't find entry:", votingPoolId);
				return;
			}
			newBallotSeriesParticipation[index] = {...newBallotSeriesParticipation[index], [field]: value};
			updateMember({BallotSeriesParticipation: newBallotSeriesParticipation});
		}

		return ballotSeriesParticipationColumns.map(col => {
			if (col.key === 'Excused') {
				const renderCell = (entry: BallotSeriesType) => 
					<Checkbox
						checked={!!entry.Excused}
						onChange={e => change(entry.VotingPoolID, 'Excused', e.target.checked? 1: 0)}
						disabled={readOnly}
					/>
				return {...col, renderCell};
			}
			if (col.key === 'SAPIN') {
				return {...col, renderCell: (entry: BallotSeriesType) => entry.SAPIN === member.SAPIN? '': entry.SAPIN};
			}
			return col;
		});

	}, [member.SAPIN, member.BallotSeriesParticipation, updateMember, readOnly]);

	return (
		<Col>
			<label>Recent ballot series participation: {getField(member, 'BallotSeriesSummary')}</label>
			<Table
				columns={columns}
				values={member.BallotSeriesParticipation}
			/>
		</Col>
	)
}

export default MemberBallotParticipation;

