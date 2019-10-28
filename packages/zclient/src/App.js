import React from 'react';
import styled from 'styled-components';

import {Ladom} from "./Ladom";
import {MyGrid} from "./MyGrid";


const palette = {
      plum: '#4b54a1',
      black: '#0c0e0d',
      blueslate: '#465f73',
      slate: '#5f5f7b',
      drab: '#b1c3a9',
      sky: '#5e86ba',
      moon: '#b3961e',
      midnight: '#0b2383',

      gold: 'gold',
      cornsilk: 'cornsilk',
      blue: 'blue',
      forest: 'forestgreen',
      crimson: 'crimson'
};

const Layout = styled.div`
    display:grid;
    height: calc(100vh);
    width: calc(100vw);
    
    row-gap:4px;
    column-gap:4px;

    grid-template-columns: 200px minmax(0, 1fr) 400px;
    grid-template-rows: 30px minmax(0, 1fr) 30px;
    grid-template-areas: "Navbar Navbar Navbar"
                         "Left CenterBody Right"
                         "Footer Footer Footer";    
`;


const Navbar = styled.section`
    grid-area: Navbar;
    background-color: ${palette.midnight};
    color: ${palette.drab};
`;
const Footer = styled.section`
    grid-row-start:3; 
    grid-column-start:1; grid-column-end:4;
    background-color: ${palette.blueslate};
    color: ${palette.drab};
`;

const CenterBody = styled.section`
    display: block;
    height:100%;
    grid-area: CenterBody;
    background-color: ${palette.drab};
    color: ${palette.black};
`;
const Left = styled.section`
    grid-area: Left;
    background-color: ${palette.cornsilk};
    color: ${palette.midnight};
`;
const Right = styled.section`
    grid-area: Right;
    background-color: ${palette.cornsilk};
    color: ${palette.midnight};
`;


const somejsx = <div>Hello<br/>There</div>;

const closef=()=>console.warn('closing');

const columnDefs = [
    {headerName: "seq", field: "seq"},
    {headerName: "time", field:"timestamp"},
    {headerName: "symbol", field: "secid"},
    {headerName: "price", field: "price"},
    {headerName: "size", field: "size"}
];


const rowData = [
    {seq:1, timestamp:0, secid: 'AAPL', price:10.23, size: 300},
    {seq:2, timestamp:0, secid: 'IBM', price:20.15, size: 2000}

];

const  App = props => {
    console.log(`user: ${props.user} acounter: ${props.acounter}`);
    const ac = 'acounter';

   return  (
        <Layout>
            <Navbar>There is text here
                <button onClick={()=>props.actions.increment(ac)}>+ {ac}:{props[ac]}</button>
                <button onClick={()=>props.actions.decrement(ac)}>- {ac}:{props[ac]}</button>

            </Navbar>
            <Left>In left side bar?</Left>
            <CenterBody><MyGrid rowData={rowData} columnDefs={columnDefs}/></CenterBody>
            <Right>In right sidebar?</Right>
            <Footer>Status stuff is over here</Footer>
        </Layout>
    );
};


export default App;
