import React, { ReactNode } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
`;

type ModalizeProps = {
  $maxWidth: string;
  children: ReactNode;
};


const FrameContent = styled.div<ModalizeProps>`
  background: white;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  padding: 20px;
  max-width: ${props=>props.$maxWidth};
  width: 100%;
  z-index: 1000;
`;


// the purpose of this component is to provide a modal appearance to its children
export const Modalize: React.FC<ModalizeProps> = ({ children, $maxWidth }:ModalizeProps) => {
  return (
    <Overlay>
      <FrameContent $maxWidth={$maxWidth}>{children}</FrameContent>
    </Overlay>
  );
};
