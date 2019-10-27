import React from 'react';
import { render } from 'react-dom';
import { createStore, bindActionCreators} from 'redux'
import { Provider, connect } from 'react-redux'

import './index.css';
import App from './App';
import {initialState} from "./constants/initial-state";
import * as actions from './action-creators'
import * as funcs from './action-funcs';

import { combineReducers } from 'redux'

function myreducer(state = initialState, action) {
    console.warn(`+action - ${action.type}`, action);
    const actionf = funcs[action.type];
    return actionf? actionf(state,action): state;
}

const rootReducer = combineReducers({myreducer });

const store = createStore(rootReducer);


const mapStateToProps = state => {
   return state.myreducer;
};


const mapDispatchToProps = dispatch => ({
    actions: bindActionCreators(actions, dispatch)
});

const ConnectedApp =  connect(
    mapStateToProps,
    mapDispatchToProps
)(App);

render(
    <Provider store={store}>
        <ConnectedApp/>
    </Provider>,
    document.getElementById('root')
);

