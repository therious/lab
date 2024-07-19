import {  NavLink, NavLinkProps } from 'react-router-dom';
import styled from 'styled-components';


export const Layout = styled.div`
    display:grid;
    height: calc(100vh);
    width: calc(100vw);
    row-gap:4px;
    column-gap:4px;
    grid-template-rows: 30px minmax(0, 1fr);
    grid-template-areas: "Navbar"
                         "CenterBody";
`;




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


export const Navbar = styled.section`
    grid-area: Navbar;
    padding-top: 5px;
    background-color: ${palette.midnight};
    color: ${palette.drab};
    height:fit-content;
    overflow: auto;
`;

const TopButton = styled.button`
  padding-right:          5px;
  padding-left:          5px;
  margin-left: 5px;
  margin-right: 5px;
`;

type StyledLinkProps = { $active:boolean } & NavLinkProps & any;
const StyledLink =  styled<StyledLinkProps>(NavLink)`
  display: inline-block;
  background: ${props=>(props as any)?.$active? '#0f0': 'antiquewhite'};
  min-width: 100px;
  border: 1px solid white;
  margin: 0;
  padding: 5px;
  border-radius: 3px;
  &:active { color: red; }
  &:hover  { background: palegreen; }
  & > * { color: orange; text-decoration: none; }
`;

type MyNavLinkProps = NavLinkProps & {curPath:string};
export const MyNavLink = ({to, children, curPath}:MyNavLinkProps)=> {
  return <StyledLink $active={curPath === to} to={to}>{children}</StyledLink>
}

export const CenterBody = styled.section`
    display: block;
    height:100%;
    grid-area: CenterBody;
    background-color: ${palette.drab};
    color: ${palette.black};
`;
