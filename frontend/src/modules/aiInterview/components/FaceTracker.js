import { useEffect, useRef } from 'react';

const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const centerOf = (points = []) => {
  if (!points.length) {
    return { x: 0, y: 0 };
  }

  const x = points.reduce((sum, point) => sum + Number(point?.x || 0), 0) / points.length;
  const y = points.reduce((sum, point) => sum + Number(point?.y || 0), 0) / points.length;
  return { x, y };
};

export default function FaceTracker({ videoRef, onScore, intervalMs = 3000 }) {
  const modelsLoadedRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    let active = true;

    const clearTimer = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const startUnavailableFallback = (reason = 'face-tracking-unavailable') => {
      clearTimer();
      intervalRef.current = setInterval(() => {
        onScore({
          unavailable: true,
          reason,
          confidence: 0,
          nervousness: 0,
          engagement: 0,
          eyeContact: 0,
          expressions: {},
          timestamp: Date.now(),
        });
      }, intervalMs);
    };

    const startTracking = async () => {
      try {
        const faceApiModule = await import('face-api.js');
        const faceapi = faceApiModule.default || faceApiModule;

        if (!modelsLoadedRef.current) {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/face-api-models'),
            faceapi.nets.faceExpressionNet.loadFromUri('/face-api-models'),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri('/face-api-models'),
          ]);
          modelsLoadedRef.current = true;
        }

        if (!active) {
          return;
        }

        clearTimer();
        intervalRef.current = setInterval(async () => {
          const video = videoRef?.current;
          if (!video || video.readyState < 2) {
            return;
          }

          try {
            const detection = await faceapi
              .detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 })
              )
              .withFaceLandmarks(true)
              .withFaceExpressions();

            if (!detection) {
              onScore({
                confidence: 0.2,
                nervousness: 0.5,
                engagement: 0.3,
                eyeContact: 0.0,
                expressions: {},
                timestamp: Date.now(),
              });
              return;
            }

            const { expressions = {}, landmarks } = detection;
            const leftEye = landmarks?.getLeftEye?.() || [];
            const rightEye = landmarks?.getRightEye?.() || [];
            const leftCenter = centerOf(leftEye);
            const rightCenter = centerOf(rightEye);
            const eyeSymmetry = 1 - Math.abs(leftCenter.y - rightCenter.y) / 20;

            const snapshot = {
              confidence: clamp((Number(expressions.neutral || 0) + Number(expressions.happy || 0) * 1.2) / 2),
              nervousness: clamp(Number(expressions.fearful || 0) + Number(expressions.surprised || 0) * 0.5),
              engagement: clamp(1 - Number(expressions.disgusted || 0) - Number(expressions.sad || 0) * 0.5),
              eyeContact: clamp(eyeSymmetry),
              expressions,
              timestamp: Date.now(),
            };

            onScore(snapshot);
          } catch (error) {
            // Ignore frame-level errors and continue sampling.
          }
        }, intervalMs);
      } catch (error) {
        startUnavailableFallback('face-api-model-load-failed');
      }
    };

    startTracking();

    return () => {
      active = false;
      clearTimer();
    };
  }, [videoRef, onScore, intervalMs]);

  return null;
}
