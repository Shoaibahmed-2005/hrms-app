/**
 * useFaceApi — loads face-api.js models once and provides detectAndDescribe().
 * Models are served from /models/ (frontend/public/models/).
 */
import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

export type FaceApiState = 'idle' | 'loading' | 'ready' | 'error';

let modelsLoaded = false; // module-level singleton — only load once

export function useFaceApi() {
  const [state, setState] = useState<FaceApiState>(modelsLoaded ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (modelsLoaded) { setState('ready'); return; }
    setState('loading');
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
      .then(() => { modelsLoaded = true; setState('ready'); })
      .catch((e) => { setError(e.message); setState('error'); });
  }, []);

  /**
   * Detects a face in the video element and returns a 128-float descriptor.
   * Returns null if no face is detected or models aren't ready.
   */
  async function detectAndDescribe(video: HTMLVideoElement): Promise<Float32Array | null> {
    if (!modelsLoaded) return null;
    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      return detection?.descriptor ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Detects a face synchronously for overlay drawing (returns box only, fast).
   */
  async function detectBox(video: HTMLVideoElement) {
    if (!modelsLoaded) return null;
    try {
      return await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }));
    } catch {
      return null;
    }
  }

  return { state, error, detectAndDescribe, detectBox };
}
