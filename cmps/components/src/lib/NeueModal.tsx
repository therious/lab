import React, {ReactNode, useEffect, useRef} from 'react'
import styled from 'styled-components';

const ModalContent = styled.dialog<{children: ReactNode}>`
  &::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
  background-color: #fefefe;
  margin:           15% auto; /* 15% from the top and centered */
  padding:          20px;
  border:           3px solid #4fd;
  width:            fit-content;
`;

type NeueModalProps = { children: ReactNode, openIt:boolean, close:()=>void };

export function NeueModal({children, openIt, close}:NeueModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(()=>{ ref?.current?.[openIt? 'showModal': 'close']()}, [openIt, ref.current]);

  return <ModalContent ref={ref} onCancel={close}>{children}</ModalContent>;
}

