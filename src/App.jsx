import { useState } from 'react'
import NewsCurator from './Components/NewsCurator.jsx'
import NewsSection from './Components/NewsSection/NewsSection.jsx'
import { Route, Routes } from 'react-router-dom'


function App() {

  return (
    <>
    <Routes>
      <Route path="/" element={<NewsSection />}/>
      <Route path="/nota/:nota_id" element={<NewsCurator />}/>
    </Routes>
    </>
  )
}

export default App
