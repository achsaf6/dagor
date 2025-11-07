import { ImageBounds } from '../types';
import { useCoordinateMapper } from '../hooks/useCoordinateMapper';

interface GridLinesProps {
  gridData: {
    verticalLines: number[];
    horizontalLines: number[];
    imageWidth: number;
    imageHeight: number;
  };
  imageBounds: ImageBounds | null;
}

export const GridLines = ({ gridData, imageBounds }: GridLinesProps) => {
  const coordinateMapper = useCoordinateMapper(
    imageBounds,
    gridData?.imageWidth || 0,
    gridData?.imageHeight || 0
  );

  if (!imageBounds || !gridData) return null;

  const { verticalLines, horizontalLines, imageWidth, imageHeight } = gridData;

  // Use coordinate mapper for proper scaling, fallback to direct calculation if not ready
  const scaleX = coordinateMapper.isReady 
    ? coordinateMapper.getScaleX() 
    : imageBounds.width / imageWidth;
  const scaleY = coordinateMapper.isReady 
    ? coordinateMapper.getScaleY() 
    : imageBounds.height / imageHeight;

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: `${imageBounds.left}px`,
        top: `${imageBounds.top}px`,
        width: `${imageBounds.width}px`,
        height: `${imageBounds.height}px`,
        isolation: 'isolate',
        mixBlendMode: 'normal',
        backgroundColor: 'transparent',
        opacity: 1,
      }}
      preserveAspectRatio="none"
      fill="none"
    >
      {/* Vertical gridlines */}
      {verticalLines.map((x, index) => (
        <line
          key={`v-${index}`}
          x1={x * scaleX}
          y1={0}
          x2={x * scaleX}
          y2={imageBounds.height}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1"
          fill="none"
        />
      ))}

      {/* Horizontal gridlines */}
      {horizontalLines.map((y, index) => (
        <line
          key={`h-${index}`}
          x1={0}
          y1={y * scaleY}
          x2={imageBounds.width}
          y2={y * scaleY}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1"
          fill="none"
        />
      ))}
    </svg>
  );
};
