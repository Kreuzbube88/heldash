import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/global.css'

// Set default theme before render to avoid flash
const savedTheme = 'dark'
const savedAccent = 'cyan'
document.documentElement.setAttribute('data-theme', savedTheme)
document.documentElement.setAttribute('data-accent', savedAccent)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
