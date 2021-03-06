import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'
import {Handle, IconCollapse} from 'dot11-components/lib/icons'
import {connect} from 'react-redux'

function getMembersSummary(members) {
	const s = {nv: 0, a: 0, pv: 0, v: 0, eo: 0}
	for (const m of Object.values(members)) {
		switch (m.Status) {
			case 'Non-Voter': s.nv++; break;
			case 'Aspirant': s.a++; break;
			case 'Potential Voter': s.pv++; break;
			case 'Voter': s.v++; break;
			case 'ExOfficio': s.eo++; break;
			default:
				break;
		}
	}
	return s;
}

const Container = styled.div`
	display: flex;
	align-items: center;
	width: 80%;
	padding: 0 10px 10px 10px;
	box-sizing: border-box;
`;

const LV = styled.div`
	display: flex;
	align-items: center;
	margin-right: 20px;
	div:first-of-type {
		font-weight: bold;
		margin-right: 10px;
	}
`;

const LabelValue = ({label, value}) =>  <LV><div>{label}</div><div>{value}</div></LV>

function MembersSummary({
	className,
	style,
	members,
}) {
	const [showSummary, setShowSummary] = React.useState(true);
	const summary = getMembersSummary(members);

	return (
		<Container
			className={className}
			style={style}
		>
			<LabelValue label='Non-Voters:' value={summary.nv}/>
			<LabelValue label='Aspirants:' value={summary.a}/>
			<LabelValue label='Potential Voters:' value={summary.pv}/>
			<LabelValue label='Voters:' value={summary.v}/>
			<LabelValue label='ExOfficio:' value={summary.eo}/>
		</Container>
	)
}

MembersSummary.propTypes = {
	members: PropTypes.object.isRequired,
}

export default connect(
	(state) => ({members: state.members.entities})
)(MembersSummary);
