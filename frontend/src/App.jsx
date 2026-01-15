import { Toaster } from 'sonner'
import Router from './router'
import './App.css'

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="min-h-screen flex items-center justify-center">
        <Router />
      </div>
    </>
  )
}

export default App
