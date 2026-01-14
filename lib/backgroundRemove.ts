import { removeNearWhiteBackground } from './image';

export async function removeBackground(buffer: Buffer) {
  // onnxruntime-node is too heavy for Vercel Serverless (exceeds 250MB limit).
  // Falling back to simple heuristic removal which works well for generated images with simple backgrounds.
  return await removeNearWhiteBackground(buffer);
}
