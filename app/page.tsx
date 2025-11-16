import { MapView } from "./components/MapView/MapView";
import { BattlemapProvider } from "./providers/BattlemapProvider";

export default function Home() {
  return (
    <BattlemapProvider>
      <MapView />
    </BattlemapProvider>
  );
}
