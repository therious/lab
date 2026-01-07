import React, {useState, useRef, useEffect, useCallback} from 'react';
import styled, {css} from 'styled-components';
import {DagViewer} from "./DagViewer";
import {FsmControl, fsmConfigToDot} from '@therious/fsm';

const solidBorder =css`
  border: 1px solid black;
`;

const elementText = css`
  font-size: 12px;
  font-weight: normal;
  color: black;
  padding: 3px;
`;

const containerPadding =css`
  padding: 2px;
`;

const FsmTag = styled.div`
  overflow-y: hidden;
  background-color: #fefefe;
  margin:           10px;
  padding:          10px;
  border:           1px solid #d0d0d0;
  border-radius:    8px;
  box-shadow:        0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  position:         relative;
  display:          flex;
  gap:              20px;
  transition:       width 0.3s ease, height 0.3s ease;
`;

const FsmFormSection = styled.div`
  flex: 0 0 auto;
  min-width: 0;
  max-width: 400px;
`;

const FsmDiagramSection = styled.div`
  flex: 1 1 auto;
  min-width: 400px;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const MachineName = styled.div`
  padding:          10px;
  font-size:        16px;
  font-weight:      bold;
`;


const StTag = styled.div`
  ${solidBorder};
  display: inline-grid;
  background-color: white;
  margin: 2px;
  border:           1px solid #333;
  border-radius: 50%;
  min-width: 40px;
  text-align:center ;
  ${elementText};
  padding: 4px;

  color: blue;
`;

const EvtTag = styled.button`
  ${solidBorder};
  border-radius: 6px;
  margin:2px;
  background-color: #abf;
  :hover {
    background-color: aqua;
  }
  ${elementText};
`;


const ContextTag = styled.div`
  margin: 5px auto;
  ${containerPadding};
  overflow: hidden;
`;

const ContextPair = styled.span`
  display:inline-block;
  margin-right: 3px;

  :not(:last-child) {
    padding-right: 10px;
    border-right: 1px dotted #aaa;
  }
`;

const ContextVarName = styled.span`
  ${elementText};

  color: black;
  text-align: right;
  display: inline;
  width: 200px;
  /* adjust the width; make sure the total of both is 100% */
  ::after { content: ":"};
`;

const ContextVarValue = styled.input`
  ${solidBorder};
  ${elementText};

  display: inline-block;
  color: mediumslateblue;
  min-width: 40px;
  width: auto;
  /* adjust the width; make sure the total of both is 100% */
  background: white;
  border: 1px solid #ccc;
  padding: 2px 4px;
`;

const SectionLabel = styled.span`
  display: inline-block;
  min-width: 60px;
  font-size: 12px;
  font-weight: bold;
  text-align: right;
  margin-right:12px;
  ::after {content: ":"}
`
const PaddedDiv = styled.div`
  ${containerPadding};
`;


const Context = ({context, onContextChange}) =>
  <ContextTag>
    <SectionLabel>Context</SectionLabel>
    {
      Object.entries(context).map(([k,v],i)=>
      <ContextPair key={i}>
        <ContextVarName>{k}</ContextVarName>
        <ContextVarValue 
          value={v?.toString()||v||''} 
          onChange={(e) => {
            const newValue = e.target.value;
            // Try to parse as number if original was a number
            const parsedValue = typeof v === 'number' ? parseFloat(newValue) || 0 : newValue;
            onContextChange(k, parsedValue);
          }}
        />
      </ContextPair>)
    }
  </ContextTag>;


const extractEventTokens = (stConfig) => {
  const {states} = stConfig;
  const tokenSet = new Set();

  Object.values(states).forEach((sob)=>{
    Object.keys(sob.on || {}).forEach(k=>tokenSet.add(k))
  })
  return [...tokenSet];
}
export const  StateForm = ({expanded, stConfig, diagram, fsmConfig}) => {

  const {id:machineName,states={},context:initialContext={} } = stConfig;
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [formWidth, setFormWidth] = useState(800);
  const [formHeight, setFormHeight] = useState(500);
  const [showDiagram, setShowDiagram] = useState(true);
  const [currentState, setCurrentState] = useState(null);
  const [previousState, setPreviousState] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const [currentContext, setCurrentContext] = useState(initialContext);
  const [currentDiagram, setCurrentDiagram] = useState(diagram);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  
  const fsmInstanceRef = useRef(null);
  const fsmConfigRef = useRef(fsmConfig || null);
  const currentStateRef = useRef(null); // Track current state for subscription callback

  const stateList = Object.keys(states);
  const evtTokens = extractEventTokens(stConfig);

  console.info(`Stateform ${stConfig.id} - `, stConfig);

  // Instantiate state machine if not already done
  useEffect(() => {
    if (!fsmConfigRef.current) {
      console.warn('No FsmConfig provided to StateForm');
      return;
    }

    if (!fsmInstanceRef.current) {
      try {
        const behavior = {};
        const options = {};
        const fsmDef = FsmControl.define(fsmConfigRef.current, behavior, options);
        const fsmInst = FsmControl.instantiate(fsmDef, true);
        fsmInstanceRef.current = fsmInst;

        // Generate initial diagram
        if (fsmConfigRef.current) {
          const visualizationOptions = {
            colors: {
              currentState: 'palegreen',
              nonCurrentState: 'cornsilk',
            },
            highlightCurrentState: false, // We'll handle via direct manipulation
          };
          const initialDiagram = fsmConfigToDot(fsmConfigRef.current, {}, visualizationOptions);
          setCurrentDiagram(initialDiagram);
        }

        // Subscribe to state changes
        fsmInst.subscribe((state) => {
          const stateValue = typeof state.value === 'string' ? state.value : Object.keys(state.value)[0];
          // Capture previous state from ref before updating
          const prevState = currentStateRef.current;
          if (prevState !== null && prevState !== stateValue) {
            setPreviousState(prevState);
            console.log('StateForm: State change detected', prevState, '->', stateValue);
          }
          currentStateRef.current = stateValue;
          setCurrentState(stateValue);
          setCurrentContext(state.context);
          // Diagram will be updated via direct DOM manipulation in DagViewer
        });

        // Set initial state
        const initialState = fsmInst.state;
        const initialValue = typeof initialState.value === 'string' ? initialState.value : Object.keys(initialState.value)[0];
        currentStateRef.current = initialValue;
        setCurrentState(initialValue);
        setCurrentContext(initialState.context);
      } catch (err) {
        console.error('Failed to instantiate state machine:', err);
      }
    }

    return () => {
      // Cleanup: stop the interpreter if component unmounts
      if (fsmInstanceRef.current) {
        fsmInstanceRef.current.stop();
        fsmInstanceRef.current = null;
      }
    };
  }, []);

  const handleEvent = useCallback((eventName) => {
    if (fsmInstanceRef.current) {
      // Capture current state before sending event (subscription will update it)
      const prevState = currentStateRef.current;
      if (prevState !== null) {
        setPreviousState(prevState);
      }
      setLastEvent(eventName);
      console.log('StateForm: Sending event', eventName, 'from state', prevState);
      fsmInstanceRef.current.send({ type: eventName });
    }
  }, []);

  const handleContextChange = useCallback((key, value) => {
    if (fsmInstanceRef.current) {
      // Send update event with the changed value
      // The machine will update its context and notify us via subscription
      fsmInstanceRef.current.send({ type: 'update', [key]: value });
    }
  }, []);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  
  const handleResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = formWidth;
    const startHeight = formHeight;
    
    const handleMouseMove = (moveEvent) => {
      const diffX = moveEvent.clientX - startX;
      const diffY = moveEvent.clientY - startY;
      const newWidth = Math.max(400, Math.min(1200, startWidth + diffX));
      const newHeight = Math.max(400, Math.min(1000, startHeight + diffY));
      setFormWidth(newWidth);
      setFormHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return(
    <FsmTag style={{
      width: isCollapsed ? '250px' : `${formWidth}px`,
      height: isCollapsed ? '60px' : `${formHeight}px`,
      minHeight: isCollapsed ? '60px' : '400px',
    }}>
      <button
        onClick={toggleCollapse}
        style={{
          position: 'absolute',
          top: '5px',
          left: '5px',
          width: '24px',
          height: '24px',
          padding: 0,
          border: '1px solid #888',
          backgroundColor: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? '▶' : '▼'}
      </button>
      
      {isCollapsed ? (
        <MachineName style={{textAlign: 'left', marginLeft: '30px', marginTop: '5px'}}>
          {machineName}
        </MachineName>
      ) : (
        <>
          <FsmFormSection>
            <MachineName style={{textAlign: 'left', marginTop: '30px'}}>{machineName}</MachineName>
            <hr/>
            <PaddedDiv>
              <SectionLabel>States</SectionLabel>
              {stateList.map((stName, i) => (
                <StTag 
                  key={i}
                  style={{
                    backgroundColor: currentState === stName ? '#90EE90' : 'white',
                    fontWeight: currentState === stName ? 'bold' : 'normal',
                    borderColor: currentState === stName ? '#228B22' : '#333',
                    borderWidth: currentState === stName ? '2px' : '1px',
                  }}
                >
                  {stName}
                </StTag>
              ))}
            </PaddedDiv>
            <hr/>
            <Context context={currentContext} onContextChange={handleContextChange}/>
            <hr/>
            <PaddedDiv>
              <SectionLabel>Events</SectionLabel>
              {evtTokens.map((evtName, i) => (
                <EvtTag 
                  key={i} 
                  onClick={() => handleEvent(evtName)}
                >
                  {evtName}
                </EvtTag>
              ))}
            </PaddedDiv>
          </FsmFormSection>
          <FsmDiagramSection>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', marginBottom: '10px'}}>
              <h4 style={{margin: 0, fontSize: '14px'}}>{showDiagram ? 'Diagram' : 'Dot Source'}</h4>
              <button
                onClick={() => setShowDiagram(!showDiagram)}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  border: '1px solid #888',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
                title={showDiagram ? 'Show dot source' : 'Show diagram'}
              >
                {showDiagram ? '📄' : '📊'}
              </button>
            </div>
            {showDiagram ? (
              <DagViewer 
                dot={currentDiagram} 
                width={"100%"} 
                height={"calc(100% - 40px)"}
                currentState={currentState}
                previousState={previousState}
                transitionEvent={lastEvent}
                animationEnabled={animationEnabled}
                transitionTime={500}
              />
            ) : (
              <textarea 
                readOnly={true} 
                value={currentDiagram} 
                style={{
                  width: '100%', 
                  height: 'calc(100% - 40px)', 
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '10px',
                  border: '1px solid #ccc',
                  backgroundColor: '#f9f9f9',
                  resize: 'none',
                }}
              />
            )}
          </FsmDiagramSection>
        </>
      )}
      
      {!isCollapsed && (
        <div
          onMouseDown={handleResize}
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '20px',
            height: '20px',
            cursor: 'nwse-resize',
            backgroundColor: '#888',
            border: '1px solid #555',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
          title="Resize form"
        >
          <div style={{
            width: '0',
            height: '0',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #fff',
            borderBottom: '6px solid #fff',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}
    </FsmTag>
  )
}
