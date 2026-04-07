
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import MainRout from './Routes/MainRout.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MainRout />
  </StrictMode>,
)
