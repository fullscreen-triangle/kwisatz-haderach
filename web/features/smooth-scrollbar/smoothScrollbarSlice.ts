import {createSlice} from '@reduxjs/toolkit'
import {ScrollbarOptions} from "smooth-scrollbar/interfaces";
import Scrollbar from "smooth-scrollbar";

export interface SmoothScrollbarState {
    scrollbar?: Scrollbar | null | Object,
    option?: Partial<ScrollbarOptions>,
    current?:any
}

const initialState: SmoothScrollbarState = {
    current: null,
}

export const smoothScrollbarSlice = createSlice({
    name: 'scrollbar',
    initialState,
    reducers: {
        setScrollbar: (state, action) => {
            state.current = action.payload
        }
    },
})


// Action creators are generated for each case reducer function
export const {setScrollbar} = smoothScrollbarSlice.actions


const smoothScrollbarReducer = smoothScrollbarSlice.reducer;

export default smoothScrollbarReducer;