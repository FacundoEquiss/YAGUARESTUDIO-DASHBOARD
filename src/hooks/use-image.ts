import { useEffect, useRef, useState } from "react";

type Status = "loading" | "loaded" | "failed";

/** Loads an HTMLImageElement from a URL for use with react-konva. */
export function useImage(url: string | null, crossOrigin?: string): [HTMLImageElement | undefined, Status] {
  const [status, setStatus] = useState<Status>("loading");
  const imageRef = useRef<HTMLImageElement | undefined>(undefined);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!url) {
      imageRef.current = undefined;
      setStatus("loading");
      return;
    }
    const img = new window.Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;

    function onLoad() {
      imageRef.current = img;
      setStatus("loaded");
      forceUpdate((n) => n + 1);
    }
    function onError() {
      imageRef.current = undefined;
      setStatus("failed");
      forceUpdate((n) => n + 1);
    }

    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    img.src = url;

    return () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
  }, [url, crossOrigin]);

  return [imageRef.current, status];
}
