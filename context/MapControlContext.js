import { createContext, useContext, useRef, useState } from "react";

const MapControlContext = createContext();

export const MapControlProvider = ({ children }) => {
  const mapRef = useRef(null);
  const [focusedStore, setFocusedStore] = useState(null); // 🆕 NEW STATE

  return (
    <MapControlContext.Provider value={{ mapRef, focusedStore, setFocusedStore }}>
      {children}
    </MapControlContext.Provider>
  );
};

export const useMapControl = () => useContext(MapControlContext);
