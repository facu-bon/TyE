import React from 'react';
import Blob from './blob';


console.log();

const EditElement = ({ items, deleteItem }) => {
    return (
        <div>
            <hr />
            <h3>Editar elementos</h3>
            {items.map((item) => (
                <Blob key={item.id} item={item} deleteItem={deleteItem} />
            ))}
        </div>
    );
};

export default EditElement;