import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore
} from 'redux-persist';
import { persistStorage } from './persistStorage';
import { markSendInterrupted, videoUploadSlice } from './videoUploadSlice';

const rootReducer = combineReducers({
  videoUpload: videoUploadSlice.reducer
});

const persistConfig = {
  key: 'pulse-root',
  storage: persistStorage,
  whitelist: ['videoUpload']
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
      }
    })
});

export const persistor = persistStore(store, undefined, () => {
  /** Only stale `sending` restored from storage (e.g. refresh mid-upload), not live uploads. */
  if (store.getState().videoUpload.phase === 'sending') {
    store.dispatch(markSendInterrupted());
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
