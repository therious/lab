export const zip = <T,U>(aa:T[], bb:U[]):[T,U][]=>
   aa.length <= bb.length? aa.map((a,i)=>[    a, bb[i]]):
                           bb.map((b,i)=>[aa[i], b    ]);

