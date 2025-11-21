"use client";

import dynamic from "next/dynamic";
import { BattlemapProvider } from "./providers/BattlemapProvider";
import { CharacterProvider } from "./providers/CharacterProvider";

const MapView = dynamic(
  () => import("./components/MapView/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
  }
);

export default function Home() {
  return (
    <BattlemapProvider>
      <CharacterProvider>
        <MapView />
      </CharacterProvider>
    </BattlemapProvider>
  );
}
