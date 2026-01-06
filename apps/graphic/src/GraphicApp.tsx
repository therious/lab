import React,  {useState, useCallback, useRef, useEffect, useMemo} from 'react';
import './App.css';
import {instance} from "@viz-js/viz";
import {stateForms, InjectedStateForms} from "./InjectedStateForms";
import {DagViewer} from "./DagViewer";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import {NeueModal} from '@therious/components';

const queryClient = new QueryClient();


// react-query compliant fetch function generator
const fetcherSvg = (url:string)=>async()=>{
  const viz = await instance();

  const response = await fetch(url);
  const exampleDoc = `digraph { could -> not -> find => "${url}" }`;

  const dotDocument:string = await response.text() ?? exampleDoc;
  const svg = viz.renderSVGElement(dotDocument,{graphAttributes: {ImageSize: {html: "width:100px, height:100px"}}});
  return svg;
}

const fetcherString =  (url:string)=>async()=>{
  const viz = await instance();

  const response = await fetch(url);
  const exampleDoc = `digraph { could -> not -> find => "${url}" }`;

  const dotDocument:string = await response.text() ?? exampleDoc;
  return dotDocument;
}

const diagramFetcher = fetcherString('/dot/physics.dot');

type AdapstSvgSvgProps = {svgsvg:SVGSVGElement}
function AdaptSvgSvg({svgsvg}:AdapstSvgSvgProps)
{
  const svg = useRef<HTMLDivElement>(null);
  useEffect(()=>{svg.current?.appendChild?.(svgsvg)},[svgsvg]);

  return (
    <div style={{maxWidth:'fit-content', maxHeight:'fit-content'}} ref={svg}/>
  );

}

function Example()
{
  const [modal, setModal] = useState<boolean>(false);
  const closeModal = useCallback(()=>setModal(false),[]);
  const openModal = useCallback(()=>setModal(true),[]);

  const { isPending, isError, data, error }  = useQuery({
    queryKey: ['diagram1'],
    queryFn: diagramFetcher
  });
  if(!isPending && !isError)
    console.log(`svg data received = `, data);

  // Get state machine diagrams
  const stateMachineDiagrams = useMemo(() => {
    try {
      return InjectedStateForms.singleton()?.getDiagrams() || [];
    } catch (e) {
      console.warn('Could not get state machine diagrams:', e);
      return [];
    }
  }, []);

  const contextMenu = useCallback((e:any) => {  // todo fix  type of event
    e.preventDefault(); // prevent the default behaviour when right clicked
    console.log("Right Click");
  },[]);

  return (
    <div className="App" onContextMenu={contextMenu}>
      <button disabled={modal} onClick={openModal}>Trigger modal</button>
      <NeueModal openIt={modal} close={closeModal}><h1>Wow</h1><p>Hello this is an extensive message</p><button onClick={closeModal}>Close me</button></NeueModal>

      <hr/>
      <div style={{
        display: 'block',
        width: 'fit-content',
        height: 'fit-content',
        border: '5px dotted red',
        marginBottom: '20px',
      }}>
        {stateForms()}
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        width: '100%',
        height: '70vh',
        minHeight: '500px',
        margin: '20px 0',
      }}>
        <div style={{
          flex: '1',
          border: '2px solid blue',
          padding: '10px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h3>Physics Diagram (from /dot/physics.dot)</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            {isPending ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><span>Loading...</span></div> : 
             isError ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'red' }}><span>Error: {error.message}</span></div> :
              data ? <DagViewer dot={data} height={"100%"} width={"100%"}/> :
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'orange' }}>
                <span>No data available</span>
              </div>
            }
          </div>
        </div>
        
        <div style={{
          flex: '1',
          border: '2px solid green',
          padding: '10px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h3>
            {stateMachineDiagrams.length > 0 
              ? `State Machine: ${stateMachineDiagrams[0].name}` 
              : 'State Machine Diagram'}
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            {stateMachineDiagrams.length > 0 ? (
              <DagViewer 
                dot={stateMachineDiagrams[0].diagram} 
                height={"100%"} 
                width={"100%"}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'orange' }}>
                <span>No state machine diagrams available</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {stateMachineDiagrams.length > 1 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          width: '100%',
          margin: '20px 0',
        }}>
          <h2>Additional State Machines</h2>
          {stateMachineDiagrams.slice(1).map(({name, diagram}, index) => (
            <div key={index} style={{
              width: '100%',
              height: '70vh',
              minHeight: '500px',
              border: '2px solid purple',
              padding: '10px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <h3>State Machine: {name}</h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                <DagViewer dot={diagram} height={"100%"} width={"100%"}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

}

//... todo add a query client provide
function GraphicApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example/>
    </QueryClientProvider>
  );
}

export default GraphicApp;
