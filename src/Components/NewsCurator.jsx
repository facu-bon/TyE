import React, { useEffect, useState } from 'react';
import EditElement from './NewsSection/EditElement';

import Output from './NewsSection/Output';



const NewsCurator = () => {
    const [text, setText] = useState('');
    const [items, setItems] = useState([]);

    //selector de imagen de portada

    const handleTextChange = (event) => {
        setText(event.target.value);
    };

    const clearText = () => {
        setText('');
        setLineBreaks(0);
    };

    const deleteItem = (id) => {
        const updatedItems = items.filter((item) => item.id !== id);
        setItems(updatedItems);
    };


    const textToArray = () => {
        const lines = text.split('\n');
        const trimmed = lines.filter((line) => line.length > 0);
        const linesarray = trimmed.map((line, index) => {
            return {
                id: Date.now() + index,
                content: line
            }
        });
        setItems(linesarray);
    };

    return (
        <div>
            <button onClick={textToArray}>Convertir</button>
            <button onClick={clearText}>Limpiar</button>
            <br />
            <textarea name="input" id="input" cols="50" rows="30" value={text} onChange={handleTextChange}></textarea>
            <EditElement items={items} deleteItem={deleteItem} />
            <Output items={items}/>


            
        </div>
    )
}
export default NewsCurator
