import {configureStore, getDefaultMiddleware} from '@reduxjs/toolkit'
import smoothScrollbarReducer from "./smooth-scrollbar/smoothScrollbarSlice";

export const store = configureStore({
    reducer: {
        scrollbar: smoothScrollbarReducer
    },
    middleware: getDefaultMiddleware({
        serializableCheck: false,
    }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type StoreDispatch = typeof store.dispatch