// IndexedDB-backed gallery storage

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "photobooth-gallery";
const DB_VERSION = 1;
const STORE_NAME = "images";

export interface GalleryImage {
  id: string;
  dataUrl: string;
  timestamp: number;
  filter: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveImage(blob: Blob, filter: string): Promise<GalleryImage> {
  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const timestamp = Date.now();

  // Convert blob to data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const image: GalleryImage = {
    id,
    dataUrl,
    timestamp,
    filter,
  };

  const db = await getDB();
  await db.put(STORE_NAME, image);

  return image;
}

export async function loadImages(): Promise<GalleryImage[]> {
  try {
    const db = await getDB();
    const images = await db.getAllFromIndex(STORE_NAME, "timestamp");
    // Return in reverse chronological order
    return images.reverse();
  } catch (err) {
    console.error("Failed to load images:", err);
    return [];
  }
}

export async function getImage(id: string): Promise<GalleryImage | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function clearAllImages(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

export async function getImageCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_NAME);
}

