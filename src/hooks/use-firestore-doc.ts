import { useCallback, useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UseFirestoreDocResult<T> {
  data: T | null;
  loading: boolean;
  exists: boolean;
  save: (next: Partial<T>) => Promise<void>;
}

/**
 * Reactive subscription to a single Firestore doc by path segments
 * (e.g. ["users", uid, "dtfSettings", "default"]).
 * Pass null in any segment to pause the listener (e.g. before auth is ready).
 */
export function useFirestoreDoc<T extends DocumentData>(
  path: Array<string | null | undefined>,
): UseFirestoreDocResult<T> {
  const enabled = path.every((p): p is string => typeof p === "string" && p.length > 0);
  const key = enabled ? path.join("/") : null;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!key) {
      setData(null);
      setLoading(false);
      setExists(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, key);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setExists(snap.exists());
        setData(snap.exists() ? (snap.data() as T) : null);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [key]);

  const save = useCallback(
    async (next: Partial<T>) => {
      if (!key) return;
      await setDoc(
        doc(db, key),
        { ...next, updatedAt: serverTimestamp() },
        { merge: true },
      );
    },
    [key],
  );

  return { data, loading, exists, save };
}
