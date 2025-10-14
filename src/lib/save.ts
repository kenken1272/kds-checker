import { Timestamp, collection, deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { AggregatedSales } from "./agg/sales";
import { db, storage } from "./firebase/client";
import { SalesRow } from "./types/sales";

export type SaveDatasetParams = {
  rows: SalesRow[];
  file: File;
  filename: string;
  userId: string;
  orgId: string;
  summary: AggregatedSales;
};

const toTopList = (input: Record<string, { signedTotal: number; signedQty: number; count: number }>) =>
  Object.entries(input)
    .sort((a, b) => Math.abs(b[1].signedTotal) - Math.abs(a[1].signedTotal))
    .slice(0, 10)
    .map(([key, value]) => ({ key, ...value }));

export const saveDataset = async ({ rows, file, filename, userId, orgId, summary }: SaveDatasetParams) => {
  if (rows.length === 0) {
    throw new Error("No rows to save");
  }

  const datasetsCollection = collection(db, `orgs/${orgId}/datasets`);
  const datasetRef = doc(datasetsCollection);
  const datasetId = datasetRef.id;
  const storagePath = `uploads/${userId}/${datasetId}/${filename}`;
  const storageRef = ref(storage, storagePath);

  let storageUploaded = false;
  let datasetCreated = false;

  try {
    const arrayBuffer = await file.arrayBuffer();
    await uploadBytes(storageRef, new Uint8Array(arrayBuffer), {
      contentType: file.type || "text/csv",
    });
    storageUploaded = true;

    await setDatasetDoc();
    await writeLineDocuments();
  } catch (error) {
    if (datasetCreated) {
      await deleteDoc(datasetRef).catch(() => undefined);
    }

    if (storageUploaded) {
      await deleteObject(storageRef).catch(() => undefined);
    }

    throw error;
  }

  async function setDatasetDoc() {
    const payload = {
      orgId,
      ownerUid: userId,
      filename,
      uploadedAt: serverTimestamp(),
      rows: rows.length,
      sumSignedTotal: summary.total.signedTotal,
      sumSignedQty: summary.total.signedQty,
      cancelledCount: summary.cancelled.count,
      cancelledAmount: summary.cancelled.amount,
      storageCsvPath: storagePath,
      summarySnapshot: {
        total: summary.total,
        cancelled: summary.cancelled,
        topByName: toTopList(summary.byName),
        topByPricemode: toTopList(summary.byPricemode),
        topByHour: toTopList(summary.byHour),
      },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
    };

  await setDoc(datasetRef, payload);
    datasetCreated = true;
  }

  async function writeLineDocuments() {
    const linesCollection = collection(datasetRef, "lines");
    const chunkSize = 500;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = rows.slice(i, i + chunkSize);

      chunk.forEach((row) => {
        const lineRef = doc(linesCollection);
        batch.set(lineRef, {
          ts: Timestamp.fromDate(row.ts),
          name: row.name,
          qty: row.qty,
          pricemode: row.pricemode,
          linetotal: row.linetotal,
          status: row.status,
          signedTotal: row.signedTotal,
          signedQty: row.signedQty,
        });
      });

      await batch.commit();
    }
  }
};
