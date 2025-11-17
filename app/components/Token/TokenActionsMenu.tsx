import { forwardRef, useRef } from "react";

interface TokenActionsMenuProps {
  movementInputId: string;
  movementValue: string;
  onMovementChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  dropdownScale: number;
  onImageUpload?: (file: File) => Promise<void>;
  isUploading?: boolean;
}

export const TokenActionsMenu = forwardRef<HTMLDivElement, TokenActionsMenuProps>(
  (
    {
      movementInputId,
      movementValue,
      onMovementChange,
      dropdownScale,
      onImageUpload,
      isUploading = false,
    },
    ref
  ) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      console.log("File selected:", file, "onImageUpload:", onImageUpload);
      if (file && onImageUpload) {
        try {
          console.log("Calling onImageUpload with file:", file.name);
          await onImageUpload(file);
          console.log("Upload completed successfully");
        } catch (error) {
          console.error("Failed to upload image:", error);
        } finally {
          // Reset the input so the same file can be selected again
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      } else {
        console.warn("File or onImageUpload missing:", { file: !!file, onImageUpload: !!onImageUpload });
      }
    };

    const handleUploadClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Upload button clicked, fileInputRef:", fileInputRef.current);
      // Use setTimeout to ensure the click happens after event propagation
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
          console.log("File input clicked");
        } else {
          console.error("File input ref is null");
        }
      }, 0);
    };

    return (
      <div
        ref={ref}
        className="absolute left-1/2 top-full z-30 mt-2 w-48 rounded-lg border border-white/10 bg-gray-900/95 p-3 text-xs text-gray-100 shadow-2xl backdrop-blur-sm"
        style={{
          transform: `translate(-50%, 0) scale(${dropdownScale})`,
          transformOrigin: "top center",
        }}
        onClick={(e) => {
          // Prevent clicks inside the menu from closing it
          e.stopPropagation();
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={movementInputId}
              className="text-[11px] font-semibold uppercase tracking-wide text-gray-300"
            >
              Movement
            </label>
            <input
              id={movementInputId}
              type="number"
              inputMode="numeric"
              value={movementValue}
              onChange={onMovementChange}
              className="w-20 rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-100 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              className="text-[11px] font-semibold uppercase tracking-wide text-gray-300"
            >
              Image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-100 transition-colors hover:bg-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Upload Image"}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

TokenActionsMenu.displayName = "TokenActionsMenu";

