import * as faceapi from "face-api.js";

const MODEL_URL = "/models/face-api";
let loadingPromise: Promise<void> | null = null;
let backendReady = false;

async function ensureBackend() {
  if (backendReady) return;

  // face-api.js bundles an older tfjs-core instance. Configure that instance
  // directly and avoid WebGL, which can throw async backend ownership errors.
  const ready = await faceapi.tf.setBackend("cpu");
  if (!ready || faceapi.tf.getBackend() !== "cpu") {
    throw new Error("Face detection CPU backend could not start. Refresh the page and try again.");
  }
  backendReady = true;
}

export function loadFaceModels(): Promise<void> {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    await ensureBackend();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  })();
  return loadingPromise;
}

export async function getDescriptorFromVideo(video: HTMLVideoElement): Promise<number[] | null> {
  await ensureBackend();
  let detections;
  try {
    detections = await detectFaces(video);
  } catch (error) {
    console.error(error);
    backendReady = false;
    await ensureBackend();
    try {
      detections = await detectFaces(video);
    } catch (fallbackError) {
      console.error(fallbackError);
      throw new Error("Face detection could not start. Refresh the page and try again.");
    }
  }
  if (detections.length === 0) return null;
  if (detections.length > 1)
    throw new Error("Multiple faces detected. Scan one employee at a time.");
  return Array.from(detections[0].descriptor);
}

function detectFaces(video: HTMLVideoElement) {
  const mobile = isMobileDevice();
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: mobile ? 224 : 320,
    scoreThreshold: mobile ? 0.55 : 0.6,
  });

  return faceapi.detectAllFaces(video, options).withFaceLandmarks(true).withFaceDescriptors();
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(ua) || navigator.hardwareConcurrency <= 4;
}

export function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

// Lower = more similar. Keep strict to reduce false matches between employees.
export const MATCH_THRESHOLD = 0.48;
export const MIN_MATCH_GAP = 0.06;
