import styled from 'styled-components';
import {Link} from 'react-router-dom';

export const Layout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

export const Navbar = styled.nav`
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
`;

export const NavLink = styled(Link)<{$active: boolean}>`
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: ${props => props.$active ? '#007bff' : '#333'};
  font-weight: ${props => props.$active ? 'bold' : 'normal'};
  border-bottom: ${props => props.$active ? '2px solid #007bff' : 'none'};
`;

export const CenterBody = styled.main`
  flex: 1;
  overflow: auto;
`;

export const SummaryContainer = styled.div`
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

export const CardsContainer = styled.div`
  width: 100%;
  min-height: 200px;
  
  /* Muuri grid container styles */
  .muuri-grid {
    position: relative;
  }
  
  .muuri-item {
    position: absolute;
    width: max-content;
    min-width: 280px;
    z-index: 1;
  }
  
  .muuri-item.muuri-item-dragging {
    z-index: 3;
  }
  
  .muuri-item.muuri-item-releasing {
    z-index: 2;
  }
  
  .muuri-item.muuri-item-hidden {
    z-index: 0;
  }
`;

export const MuuriItem = styled.div`
  width: max-content;
  min-width: 280px;
  margin: 0.375rem;
  box-sizing: border-box;
`;

export const ElectionSummaryCard = styled(Link)`
  padding: 1rem;
  border: 2px solid #ccc;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #007bff;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
  }
`;

export const ElectionTitle = styled.h2`
  margin: 0;
  font-size: 1.2rem;
`;

