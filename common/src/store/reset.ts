import type { Action } from "@reduxjs/toolkit";

export const RESET_STORE_ACTION = "root/RESET_STORE";
export const resetStore = (): Action => ({ type: RESET_STORE_ACTION });
