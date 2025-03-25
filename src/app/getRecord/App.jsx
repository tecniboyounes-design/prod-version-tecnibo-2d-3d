import React, { useState } from "react";
import ProductList from "./ProductList";
import Cart from "./Cart";

const App = () => {
    const [cartItems, setCartItems] = useState([]);

    const addToCart = (product) => {
        setCartItems((prev) => {
            const exists = prev.find((item) => item.id === product.id);
            if (exists) {
                return prev.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prev, { ...product, quantity: 1 }];
            }
        });
    };

    const updateQuantity = (id, amount) => {
        setCartItems((prev) =>
            prev
                .map((item) =>
                    item.id === id ? { ...item, quantity: Math.max(item.quantity + amount, 1) } : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeFromCart = (id) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
    };

    return (
        <div className="flex w-full align-center min-h-screen bg-gray-100 p-8">
            <div className="w-1/2 pr-6">
                <h1 className="text-2xl font-bold mb-4">🛍️ Product List</h1>
                <ProductList onAddToCart={addToCart} />
            </div>
            <div className="w-1/2 bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                    Shopping cart <span className="text-gray-500">({cartItems.length} Items)</span>
                </h2>
                <Cart
                    items={cartItems}
                    onRemove={removeFromCart}
                    onUpdateQuantity={updateQuantity}
                />
            </div>
        </div>
    );
};

export default App;
