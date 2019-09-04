import React, { Component } from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Map from './components/Map/index';

class Routes extends Component {
  render() {
    return (
      <BrowserRouter>
          <Switch>
            <Route exact path="/" component={Map}/>
          </Switch>
      </BrowserRouter>
    );
  }
}

export default Routes;