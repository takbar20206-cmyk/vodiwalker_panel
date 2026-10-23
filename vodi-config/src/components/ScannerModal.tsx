import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import type { Translate } from '../i18n';
import { Sheet } from './Overlay';

interface Props {
  t: Translate;
  onClose: () => void;
  onResult: (link: string) => void;
}

export function ScannerModal({ t, onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    let timer: number | undefined;

    const decodeFrame = (): boolean => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return false;

      const maxSide = 520;
      const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.round(video.videoWidth * scale);
      const height = Math.round(video.videoHeight * scale);
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return false;
      ctx.drawImage(video, 0, 0, width, height);
      const image = ctx.getImageData(0, 0, width, height);
      const result = jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' });
      if (result?.data && result.data.includes('://')) {
        onResult(result.data.trim());
        return true;
      }
      return false;
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t('scan.unsupported'));
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();
        setReady(true);

        timer = window.setInterval(() => {
          if (cancelled) return;
          if (decodeFrame()) {
            if (timer) window.clearInterval(timer);
            timer = undefined;
          }
        }, 250);
      } catch (err) {
        const name = (err as { name?: string })?.name ?? '';
        setError(name === 'NotAllowedError' || name === 'SecurityError' ? t('scan.denied') : t('scan.unsupported'));
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Sheet title={t('scan.title')} onClose={onClose} closeLabel={t('action.close')}>
      {error ? (
        <>
          <div className="dns-result error" style={{ marginBottom: 14 }}>
            <span>{error}</span>
          </div>
          <button className="btn btn-ghost btn-block" onClick={onClose} type="button">
            {t('action.close')}
          </button>
        </>
      ) : (
        <>
          <div className="scanner-stage">
            <video ref={videoRef} muted playsInline />
            <div className="scanner-frame" />
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <p className="scanner-hint">{ready ? t('scan.hint') : t('scan.starting')}</p>
          <button className="btn btn-ghost btn-block" onClick={onClose} type="button">
            {t('action.cancel')}
          </button>
        </>
      )}
    </Sheet>
  );
}
