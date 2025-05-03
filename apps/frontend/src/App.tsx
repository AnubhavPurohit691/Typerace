
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Createroom from './Page/Createroom'
import Gamepage from './Page/Gamepage'

const App = () => {
  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white'>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Createroom/>}/>
          <Route path='/game' element={<Gamepage/>}/>
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
