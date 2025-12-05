import React from 'react'
import plant_nc from '../../Data/NotaCompleta'


const Output = ({items }) => {
    const PreTitle = plant_nc[0].split('\n')
    const PreBody = plant_nc[1].split('\n')
    const PostBody = plant_nc[2].split('\n')
    
    const itemToTitle = (item) => {
//         <title>Desembarca en Vaca Muerta una de las principales petroleras independientes de Estados Unidos</title>
// <meta property="og:image" content="https://www.transporteyenergia.com.ar/Imagenes/2025-11-18-Energia004.jpg"/>
// <link rel="canonical" href="https://www.transporteyenergia.com.ar/Noticias/Noticias-202511/desembarca-en-vaca-muerta-una-de-las-principales-petroleras-independie.html"/>
// <meta property="og:title" content="Desembarca en Vaca Muerta una de las principales petroleras independientes de Estados Unidos - Transporte y Energia "/>
// <meta property="og:url" content="https://www.transporteyenergia.com.ar/Noticias/Noticias-202511/desembarca-en-vaca-muerta-una-de-las-principales-petroleras-independie.html"/>
// <meta property="og:site_name" content="TransporteyEnergia" />
        //toma el titulo y lo aplica a la primer parte de la platilla 
        
    }
    


    // {PreTitle.map((item) => (<div>{item}</div>))} 
    // ItemToTitle
    // {PreBody.map((item) => (<div>{item}</div>))}
    // ItemsToBody
    // {PostBody.map((item) => (<div>{item}</div>))}
    
    
    return (
        <div>

        </div>
    )
}

export default Output
