import './App.css'
import HorariosTable from './components/HorariosTable.jsx'
import { Toaster } from 'sonner'

function App() {
  return (
    <>
    <Toaster richColors position="top-right" />
      <div className="min-h-screen bg-black-50">
        <HorariosTable />
      </div>
    </>
  )
}

export default App
