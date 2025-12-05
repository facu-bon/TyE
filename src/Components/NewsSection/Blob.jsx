import React from 'react';
const eliminable = [
    //palabras o fraces tipicas en notas de la web que indiquen enlaces a otras notas o publicidad
    'Te puede interesar'

];

const Blob = ({ item, deleteItem }) => {
    const handleClose = () => {
        deleteItem(item.id);
        console.log('Attempting to close blob for item id:', item.id);

    };

    return (
        <>
                <button className="tagT" onClick={handleClose}>T</button>
                <button className="tagB" onClick={handleClose}>B</button>
                <button className="tagE" onClick={handleClose}>E</button>
                <button className="tagN" onClick={handleClose}>N</button>
                <br />
            <div className="blob" data-key={item.id}>
                <button className="close-button" onClick={handleClose}>X</button>

                <span className="blob-content"
                    style={{ color: eliminable.some((eliminable) => item.content.includes(eliminable)) ? 'red' : 'black' }}
                >{item.content}</span>
            </div>
            <br />
        </>
    );
};

export default Blob;

