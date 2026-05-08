import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function useMediaCompression() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  if (!ffmpegRef.current) {
    ffmpegRef.current = new FFmpeg();
  }

  const compressMedia = async (file: File): Promise<File> => {
    setIsCompressing(true);
    setProgress(0);
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) throw new Error("FFmpeg not initialized");

    let progressInterval: NodeJS.Timeout;
    const progressHandler = ({ progress }: { progress: number }) => {
      if (progress > 0 && progress <= 1) {
        setProgress(Math.round(progress * 100));
      }
    };

    try {
      if (!ffmpeg.loaded) {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }

      let simulatedProgress = 0;
      progressInterval = setInterval(() => {
        simulatedProgress += (90 - simulatedProgress) * 0.05; // Ease towards 90%
        setProgress((prev) => Math.max(prev, Math.round(simulatedProgress)));
      }, 500);

      ffmpeg.on('progress', progressHandler);

      const { name, type } = file;
      const extension = name.split('.').pop()?.toLowerCase();
      const inputName = `input.${extension}`;
      const outputName = `output.${extension}`;

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Compression logic based on file type without changing format
      if (extension === 'gif') {
        // Compress GIF by scaling to 400px width and reducing frame rate
        await ffmpeg.exec(['-i', inputName, '-vf', 'scale=400:-1', '-r', '15', '-loop', '0', outputName]);
      } else if (extension === 'mp4' || extension === 'webm') {
        // Compress video by scaling to 400px width and reducing bitrate
        await ffmpeg.exec(['-i', inputName, '-vf', 'scale=400:-1', '-r', '24', '-b:v', '500k', outputName]);
      } else {
        // Fallback for other formats
        return file; 
      }

      const data = await ffmpeg.readFile(outputName);
      
      // Free memory
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      return new File([data as Uint8Array], name, { type });
    } catch (error) {
      console.error('Compression failed:', error);
      throw error; // Let the caller handle the error, perhaps by uploading original
    } finally {
      clearInterval(progressInterval);
      ffmpeg.off('progress', progressHandler);
      setIsCompressing(false);
      setProgress(0);
    }
  };

  return { compressMedia, isCompressing, progress };
}
