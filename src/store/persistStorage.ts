/**
 * redux-persist storage for the browser. Default import from `redux-persist/lib/storage`
 * can break under Vite/ESM (storage.getItem is not a function).
 */
function createLocalStorage(): {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
} {
  return {
    getItem(key: string) {
      return Promise.resolve(window.localStorage.getItem(key));
    },
    setItem(key: string, value: string) {
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    },
    removeItem(key: string) {
      window.localStorage.removeItem(key);
      return Promise.resolve();
    }
  };
}

const noopStorage = {
  getItem: (): Promise<null> => Promise.resolve(null),
  setItem: (): Promise<void> => Promise.resolve(),
  removeItem: (): Promise<void> => Promise.resolve()
};

export const persistStorage =
  typeof window !== 'undefined' ? createLocalStorage() : noopStorage;
