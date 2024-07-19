// take a variable number of arguments and prefer the first initialized one
function preferString(o, a, b) {
  return o[a] ? o[a] : (o[b] ? o[b] : '');
}
function isNumber(a)   {return typeof a === 'number' && isFinite(a);              }

const fmtMillisAsSeconds = {minimumIntegerDigits: 1, maximumFractionDigits: 3, minimumFractionDigits:0};

function convertMillisToLabel(millis)
{
  const nMillis = millis * 0.001;

  return nMillis.toLocaleString('en-us', fmtMillisAsSeconds) + ' secs';
}

export class FsmViz {
   _visualizeStates(nodeNameMap, edges) {
     const states = this.graph.srcStates;
     const sm = this.graph.stateMap;
     const nodes = ['startHere[shape=box]'];
     // use pair of maps to isolate terminal nodes
     // generate strings for the nodes themselves
     for (let i = 0; i < states.length; ++i) {
       const st = states[i];
       if (st === this.graph.initialState) {
         edges.push(`startHere->n${i} [style=dashed label="initialState" fontSize=10]`);
       }
       const color = (st === this.perinst.state.s) ? 'color=palegreen' : '';
       const shape = sm[st].terminal ? 'shape=box' : '';

       const noden = `n${i}`;
       nodes.push(`${noden} [label = "${st}" ${color} ${shape}]`);
       nodeNameMap[st] = noden;
     }
     return nodes;
   }

   _visualizeTransitions(nodeNameMap, edges) {
     const trans = this.graph.srcTransitions;
     for (let i = 0; i < trans.length; ++i) {
       const tsrc = trans[i];
       let j, temp, states;
       if (tsrc.from === '*') {
         temp = {...tsrc}//cloneProperties(tsrc);
         states = this.graph.srcStates;
         for (j = 0; j < states.length; ++j) {
           if (tsrc.to !== states[j]) {
             temp.from = states[j];
             this._visualizeTransition(temp, nodeNameMap, edges, true);
           }
         } // end for
       }
       if (Array.isArray(tsrc.from)) {
         temp =  {...tsrc}//cloneProperties(tsrc);
         states = tsrc.from;
         for (j = 0; j < states.length; ++j) {
           temp.from = states[j];
           this._visualizeTransition(temp, nodeNameMap, edges);
         } // end for
       } else {
         // normal case
         this._visualizeTransition(tsrc, nodeNameMap, edges);
       }
     } // end for
   }

   _visualizeTransition(transition, nodeNameMap, edges, ephemeral) {
     let event = preferString(transition, 'timer', 'evt');
     if (isNumber(transition.timer)) {
       event =  convertMillisToLabel(event); //th.sprintf("%0.2f secs", event / 1000);
     }
     let cond = preferString(transition, 'when', 'when');
     if (cond) {
       const extraspace = event ? ' ' : '';    // do I add an extra space?
       cond = extraspace + '[' + cond + ']';  // rendered with brackets by Harel fsm convention
     }

     const from = nodeNameMap[transition.from];
     const to = nodeNameMap[transition.to];
     const ephstr = ephemeral ? ' color=grey' : '';
     edges.push(`${from}->${to} [label="${event}${cond}"${ephstr}]`);

   }


   visualize() {
     const nodeNameMap = {};
     const edges = [];
     const nodes = this._visualizeStates(nodeNameMap, edges);

     this._visualizeTransitions(nodeNameMap, edges);


     return `
digraph {
  rankdir=LR
  compound=true
  node[fontsize=14 width=.8  shape=circle style=filled color=cornsilk]
  edge[color=blue fontsize=10]
  ${nodes.join("\n  ")}
  ${edges.join("\n  ")}
}   
`;

   }
}
