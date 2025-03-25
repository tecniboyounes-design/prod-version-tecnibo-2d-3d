import React from "react";

const ProductList = ({ products, onAddToCart }) => {
    return (
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 grid gap-6">
            {products.map((product) => (
                <div
                    key={product.id}
                    className="flex items-center gap-4 bg-white p-4 rounded shadow"
                >
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-left">{product.name}</h3>
                        <p className="text-sm text-gray-500 text-left">{product.description}</p>
                    </div>
                    <div className="text-right">
                        <div className="font-bold">${product.price.toFixed(2)}</div>
                        <button
                            onClick={() => onAddToCart(product)}
                            className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                            Add to Cart
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProductList;