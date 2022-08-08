import React from 'react';
import {BrowserRouter as Router} from 'react-router-dom';
import styled from '@emotion/styled';

import Header from './Header';
import Body from './Body';

const OuterDiv = styled.div`
	display: flex;
	flex-direction: column;
	height: 100vh;
	align-items: center;
`;

function App({user, access}) {

	return (
		<Router basename='/comments'>
			<OuterDiv>
				<Header user={user} access={access} />
				<Body user={user} access={access} />
			</OuterDiv>
		</Router>
	)
}

export default App;
