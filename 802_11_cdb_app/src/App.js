import React from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'; 
import LoginForm from './Login.js';
import Users from './Users.js';
import Ballots from './Ballots.js';
import Comments from './Comments.js';

class App extends React.Component {

  render() {
    return (
      <div id="App">
        <header>
          <h3 className="AppTitle">802.11 Comment Database</h3>
          <LoginForm className="LoginForm" />
        </header>
        <main>
          <Tabs
            className="Tabs"
            selectedTabClassName="Tabs_Tab--selected"
            disabledTabClassName="Tabs_Tab--disabled"
            selectedTabPanelClassName="Tabs_TabPanel--selected"
            forceRenderTabPanel={true}>
            <TabList className="Tabs_TabList">
              <Tab className="Tabs_Tab">Users</Tab>
              <Tab className="Tabs_Tab">Ballots</Tab>
              <Tab className="Tabs_Tab">Comments</Tab>
            </TabList>
            <TabPanel className="Tabs_TabPanel">
              <Users />
            </TabPanel>
            <TabPanel className="Tabs_TabPanel">
              <Ballots />
            </TabPanel>
            <TabPanel className="Tabs_TabPanel">
              <Comments />
            </TabPanel>
          </Tabs>
        </main>
      </div>
    )
  }
}

export default App;
