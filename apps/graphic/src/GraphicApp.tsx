import React,  {useState, useCallback, useRef, useEffect} from 'react';
import './App.css';
import {instance} from "@viz-js/viz";
import {stateForms} from "./InjectedStateForms";

import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {NeueModal} from '@therious/components';

const queryClient = new QueryClient();



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
