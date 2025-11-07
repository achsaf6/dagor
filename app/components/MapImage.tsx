import Image from "next/image";

interface MapImageProps {
  onLoad?: () => void;
  scale?: number;
  translateX?: number;
  translateY?: number;
}

export const MapImage = ({ 
  onLoad, 
  scale = 1, 
  translateX = 0, 
  translateY = 0 
}: MapImageProps) => {
  const transform = scale !== 1 || translateX !== 0 || translateY !== 0
    ? `scale(${scale}) translate(${translateX}px, ${translateY}px)`
    : undefined;

  return (
    <Image
      src="/maps/city-assault-30-x-50-phased-v0-87llyi5jgauf1.png"
      alt="City Assault Map"
      fill
      className="object-contain pointer-events-none"
      style={{ 
        opacity: 1,
        transform,
        transformOrigin: 'center center',
      }}
      priority
      onLoad={onLoad}
      draggable={false}
    />
  );
};

