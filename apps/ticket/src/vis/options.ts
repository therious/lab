import {Options as VisNetworkOptions} from "vis-network/standalone/esm/vis-network";

type ArrowEndOptions = {enabled:boolean};
export type EdgeOptions = {color:string, width:number, arrows: {to: ArrowEndOptions, from: ArrowEndOptions}};

export const defaultOptions:VisNetworkOptions = {

  width: '1800px',
  height: '1000px',
  // physics: {enabled: false},
  nodes: {
    color: {
      background: 'white',
      border: 'black',
      highlight: {
        background: 'pink',
        border: 'red'
      }
    },
    shape: 'box'
  },
  edges: { color:'yellow', width: 10, arrows: {to:{enabled:false}, from:{enabled:false}}},
  interaction: {
    dragView: false,
    multiselect: false,
    zoomView:false,
    keyboard: {
      enabled:false,
      speed: {
        x: 10,
        y: 10,
        zoom: 0.02
      }
    }
  }
};
