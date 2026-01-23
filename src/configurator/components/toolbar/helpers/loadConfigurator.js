// src/configurator/components/helpers/loadConfiguratorList.js
import { setConfiguratorList } from "@/store";
import axios from "axios";

export const loadConfiguratorList = async (dispatch) => {
  try {
    const res = await axios.get("/api/configurator");
    console.log("[loadConfiguratorList] response:", res.data);
    dispatch(setConfiguratorList(res.data));
    console.info("[loadConfiguratorList] loaded:", res.data.length);
  } catch (e) {
    console.error("[loadConfiguratorList] failed:", e.message);
    throw e;
  }
};

