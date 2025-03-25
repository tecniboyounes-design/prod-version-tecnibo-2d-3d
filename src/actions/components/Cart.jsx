// components/Cart.jsx
import React from "react";
import { Trash2 } from "lucide-react";

const Cart = ({ items, onRemove, onUpdateQuantity }) => {
    return (
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {items.length === 0 && <p className="text-gray-500">Your cart is empty.</p>}
            {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 border-b py-4">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                    <div className="text-right w-24 font-medium">${item.price.toFixed(2)}</div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="px-2 py-1 border rounded"
                        >
                            -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="px-2 py-1 border rounded"
                        >
                            +
                        </button>
                    </div>
                    <button onClick={() => onRemove(item.id)} className="text-red-500 ml-4">
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Cart;