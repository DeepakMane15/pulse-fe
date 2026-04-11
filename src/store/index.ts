import { combineReducers, configureStore, type Reducer } from '@reduxjs/toolkit';
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
import { markSendInterrupted, videoUploadSlice, type VideoUploadState } from './videoUploadSlice';

const rootReducer = combineReducers({
  videoUpload: videoUploadSlice.reducer
});

/** Matches redux-persist’s `_persist` slice after rehydration. */
export type RootState = {
  videoUpload: VideoUploadState;
  _persist?: { version: number; rehydrated: boolean };
};

const persistConfig = {
  key: 'pulse-root',
  storage: persistStorage,
  whitelist: ['videoUpload']
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

type ConfigureRootOpts = NonNullable<Parameters<typeof configureStore<RootState>>[0]>;
type MiddlewareFnRoot = NonNullable<ConfigureRootOpts['middleware']>;
type GetDefaultMiddleware = Parameters<MiddlewareFnRoot>[0];

export const store = configureStore<RootState>({
  reducer: persistedReducer as Reducer<RootState>,
  middleware: (getDefaultMiddleware: GetDefaultMiddleware) =>
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

export type AppDispatch = typeof store.dispatch;
