import React, { useCallback } from 'react';
import styled from 'styled-components';

const Span = styled.span`
  margin: 10px;
  white-space: nowrap ;
`;

const Heading = styled.span`
  display: inline-block;
  margin: 10px;
  text-align: right;
  min-width: 100px;
  max-width: 100px;
  font-weight: bolder;
`;

type CheckGroupProps = {
  heading?: string;
  active?: boolean;
  name?: string;
  choices: Record<string, boolean>;
  setChoice: (id: string, checked: boolean) => void;
  titles?: Record<string, string>;
};

export const CheckGroup = ({ heading, active, name, choices, setChoice, titles }: CheckGroupProps): JSX.Element => {
  const cb = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setChoice(e.target.id, e.target.checked);
  }, [setChoice]);

  // choices is an array of strings
  // defaultChoice
  const cc = Object.entries(choices).map(([k, v]) => (
    <Span key={k}>
      <input disabled={active === false} type="checkbox" name={name} id={k} value={k} onChange={cb} checked={v} />
      <label htmlFor={k} title={titles?.[k]} style={{cursor: titles?.[k] ? 'help' : 'default'}}>{k}</label>
    </Span>
  ));
  
  return heading ? (
    <div>
      <Heading>{heading}</Heading>
      {cc}
    </div>
  ) : (
    <div>{cc}</div>
  );
};

