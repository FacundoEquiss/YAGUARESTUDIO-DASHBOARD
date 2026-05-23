import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface FirestoreItem {
  id: string;
}

interface UseFirestoreCollectionResult<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  add: (data: Omit<T, "id">) => Promise<string | null>;
  update: (id: string, data: Partial<Omit<T, "id">>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Reactive Firestore collection subscription.
 * Pass null in any segment to pause the listener (e.g. before auth resolves).
 */
export function useFirestoreCollection<T extends FirestoreItem>(
  path: Array<string | null | undefined>,
  options?: { orderByField?: string; orderDirection?: "asc" | "desc" },
): UseFirestoreCollectionResult<T> {
  const enabled = path.every((p): p is string => typeof p === "string" && p.length > 0);
  const key = enabled ? path.join("/") : null;
  const orderByField = options?.orderByField;
  const orderDirection = options?.orderDirection ?? "desc";

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const constraints = useMemo<QueryConstraint[]>(() => {
    return orderByField ? [orderBy(orderByField, orderDirection)] : [];
  }, [orderByField, orderDirection]);

  useEffect(() => {
    if (!key) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const ref = collection(db, key);
    const q = constraints.length ? query(ref, ...constraints) : ref;
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as T[]);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [key, constraints]);

  const add = useCallback(
    async (data: Omit<T, "id">): Promise<string | null> => {
      if (!key) return null;
      const ref = await addDoc(collection(db, key), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    },
    [key],
  );

  const update = useCallback(
    async (id: string, data: Partial<Omit<T, "id">>): Promise<void> => {
      if (!key) return;
      await updateDoc(doc(db, key, id), { ...data, updatedAt: serverTimestamp() });
    },
    [key],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!key) return;
      await deleteDoc(doc(db, key, id));
    },
    [key],
  );

  return { items, loading, error, add, update, remove };
}
