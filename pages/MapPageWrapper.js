import MapPage from "../pages/MapPage";
import { MapControlProvider } from "../context/MapControlContext";

export default function MapPageWrapper() {
  return (
    <MapControlProvider>
      <MapPage />
    </MapControlProvider>
  );
}
