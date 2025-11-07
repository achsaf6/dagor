import { User, ImageBounds } from "../types";
import { UserCircle } from "./UserCircle";

interface UserCirclesProps {
  users: Map<string, User>;
  imageBounds: ImageBounds | null;
  worldMapWidth?: number;
  worldMapHeight?: number;
}

export const UserCircles = ({ 
  users, 
  imageBounds,
  worldMapWidth = 0,
  worldMapHeight = 0,
}: UserCirclesProps) => {
  if (!imageBounds) return null;

  return (
    <>
      {Array.from(users.values()).map((user) => (
        <UserCircle
          key={user.id}
          position={user.position}
          color={user.color}
          imageBounds={imageBounds}
          worldMapWidth={worldMapWidth}
          worldMapHeight={worldMapHeight}
        />
      ))}
    </>
  );
};

