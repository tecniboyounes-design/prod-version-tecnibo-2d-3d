// components/ProductList.jsx
import React from "react";

const fakeProducts = [
    {
        id: 1,
        name: "Hollow Port",
        description: "Awesome yellow t-shirt",
        price: 39.11,
        image: "https://picsum.photos/300/300",
    },
    {
        id: 2,
        name: "Circular Sienna",
        description: "Awesome white t-shirt",
        price: 24.89,
        image: "https://picsum.photos/300/300",
    },
    {
        id: 3,
        name: "Realm Bone",
        description: "Awesome black t-shirt",
        price: 22.0,
        image: "https://picsum.photos/300/300",
    },
    {
        id: 4,
        name: "Pest color shirt",
        description: "Awesome black t-shirt",
        price: 22.0,
        image: "https://picsum.photos/300/300",
    },
];

const ProductList = ({ onAddToCart }) => {
    return (
        <div className="grid gap-6">
            {fakeProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-4 bg-white p-4 rounded shadow">
                    <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded" />
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-left">{product.name}</h3>
                        <p className="text-sm text-gray-500 text-left">{product.description}</p>
                    </div>
                    <div className="text-right">
                        <div className="font-bold">${product.price.toFixed(2)}</div>
                        <button
                            onClick={() => onAddToCart(product)}
                            className="mt-2 bg-blue-600 text-black px-3 py-1 rounded text-sm">
                            Add to Cart
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProductList;
