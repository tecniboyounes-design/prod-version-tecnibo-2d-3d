import axios from "axios";
import store, { setWallPrice, setWallInfo } from "@/store";

/**
 * Calculates wall price by calling the API and updates the Redux state.
 * @param {Object} wallData - Wall data to send to the API.
 * @returns {Promise<number>} The calculated total price.
 */
export async function calculateWallPriceClient(wallData) {
  try {
    const res = await axios.post("/api/calculateWallPrice", wallData, {
      headers: { "Content-Type": "application/json" },
    });
    
    // Dispatch all data from backend to wallInfo state
    if (wallData.id && res.data) {
      store.dispatch(setWallInfo({ wallId: wallData.id, info: res.data }));
    }

    // Optionally, still update total price in wall state for compatibility
    if (wallData.id && typeof res.data.totalPrice === "number") {
      store.dispatch(setWallPrice({ wallId: wallData.id, totalPrice: res.data.totalPrice }));
    }
    
    return res.data.totalPrice;
  } catch (error) {
    const errMsg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Failed to calculate wall price";
    console.error("[WallPriceClient] Error:", errMsg);
    throw new Error(errMsg);
  }
}
