import React from 'react';
import { BrowserRouter, Route, Switch } from "react-router-dom";
import CreateRoom from "./routes/CreateRoom";
import LoginComponent from "./components/Login/Login"
import HomeComponent from "./components/Home/Home"
import Room from "./routes/Room";
import RoomOverviewComponent from "./components/Room/index"
import AppBarComponent from './components/Header/AppBar'

function App() {
  return (
    <div>
      <BrowserRouter>
        <Switch>
          <Route path="/" exact component={LoginComponent} />
          <Route path="/home" component={HomeComponent} />
          {/* <Route path="/room/:roomID" component={Room} /> */}
          <Route path="/room/list" component={RoomOverviewComponent} />
        </Switch>
      </BrowserRouter>      
      <AppBarComponent />
    </div>
  );
}

export default App;
