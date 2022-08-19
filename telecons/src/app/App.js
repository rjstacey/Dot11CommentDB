import React from 'react';
import {BrowserRouter as Router} from 'react-router-dom';
import styled from '@emotion/styled';

import {ErrorModal, ConfirmModal} from 'dot11-components/modals';
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
		<Router basename='/telecons'>
			<OuterDiv>
				<Header user={user} access={access} />
				<Body user={user} access={access} />
				<ErrorModal />
				<ConfirmModal />
			</OuterDiv>
		</Router>
	)
}

export default App;
