interface Navigator {
  xr?: {
    isSessionSupported: (mode: string) => Promise<boolean>;
    requestSession: (mode: string, options?: any) => Promise<any>;
  };
}

interface Window {
  showSaveFilePicker?: (options?: any) => Promise<any>;
}
