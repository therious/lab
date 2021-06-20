import React from 'react';
import styled, {css} from 'styled-components';

const bdr = '1px solid black';

const solidBorder =css`
  margin-bottom: 0;
  margin-right: 0;
  margin-top: -1px;
  margin-left: -1px;
  border: 1px solid black;
`;

const containerPadding =css`
 padding: 2px;
`;

const StateContent = styled.div`
  background-color: #fefefe;
  margin:           10px auto; /* 15% from the top and centered */
  padding:          10px;
  border:           1px solid #888;
  width:            80%;
`;

const StDiv = styled.div`
  ${solidBorder};
  background-color: #cccccc;
  padding:         10px;
  border:           1px solid #333;
  color: blue;
  ::before {content: "St: "}
`;

const EvtDiv = styled.div`
  ${solidBorder};
  background-color: #abf;
  padding:         10px;
  color: green;
  ::before {content: "Evt: "}
`;

const MachineName = styled.div`
  padding:          10px;
  font-size:        16px;
  font-weight:      bold;
  ::before {content: "Machine: "}
`;


const ContextDiv = styled.dl`
  margin: 5px auto;
  ${containerPadding};
  overflow: hidden;
`;
const VarName = styled.dt`
  ${solidBorder};
  color: darkred;
  float: left;
  width: 50%;
  /* adjust the width; make sure the total of both is 100% */
  background: #cc0;
  padding: 3px;

`;

const VarValue = styled.dd`
  ${solidBorder};
  color: mediumslateblue;
  float: left;
  width: 50%;
  /* adjust the width; make sure the total of both is 100% */
  background: white;
  padding: 3px;
`;

const PaddedDiv = styled.div`
${containerPadding};
`;


const ContextVars = ({context}) =>
<ContextDiv>
    {Object.entries(context).map(([k,v])=><><VarName>{k}</VarName><VarValue>{v.toString()}</VarValue></>)}
</ContextDiv>;


const extractEventTokens = (stConfig) => {
    const {states} = stConfig;
    const tokenSet = new Set();

    Object.entries(states).forEach(([stName,sob])=>{
        Object.keys(sob.on || {}).forEach(k=>tokenSet.add(k))
    })
    return [...tokenSet];
}
export const  StateForm = ({stConfig}) => {

    const {id:machineName,states={},context={}} = stConfig;

    const stateList = Object.keys(states);
    const evtTokens = extractEventTokens(stConfig);

  return(
      <StateContent>
          <MachineName>{machineName}</MachineName>
          <ContextVars context={context}/>

          <PaddedDiv>
            {stateList.map(stName=>(<StDiv>{stName}</StDiv>))}
          </PaddedDiv>
          <PaddedDiv>
            {evtTokens.map(evtName=>(<EvtDiv>{evtName}</EvtDiv>))}
          </PaddedDiv>
      </StateContent>
  )
}
