import React from 'react';
import {format} from "date-fns";
const dtfmt = "MMM dd HH:mm:ss";

const myformat = (n) => format(new Date(n), dtfmt);
//  return format(n)DateTime.fromMillis(n).toFormat(dtfmt);


export const  UpdatedRenderer = ({data, value}) => {
  if(data === undefined)
    return <></>

  return <span style={{fontFamily: 'monospace'}}>{myformat(value)}</span>
}

