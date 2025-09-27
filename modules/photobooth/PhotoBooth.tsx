import React, { useState, useRef, useEffect } from 'react';
import { editImage } from '../../services/geminiService.ts';
import { EditIcon } from '../../components/Icons.tsx';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { GeneratedContent } from '../../types.ts';
import { dataURLToBase64, getMimeType, getImageSize, formatFileSize } from '../../utils/imageUtils.ts';

const PhotoBooth: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { addContentToGallery } = useAppContext();

    const [isCameraOn, setIsCameraOn] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('make me wear a pirate hat');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        if (capturedImage || !videoRef.current) {
            return;
        }

        let stream: MediaStream | null = null;
        
        const enableStream = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 1280, height: 720, facingMode: 'user' } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsCameraOn(true);
                    setCameraError(null);
                }
            } catch (err) {
                 console.error("Error accessing camera:", err);
                 setCameraError("Could not access the camera. Please check permissions and try again.");
                 setIsCameraOn(false);
            }
        };

        enableStream();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            setIsCameraOn(false);
        };
    }, [capturedImage]);

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && isCameraOn) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.save(); // Save the default state
                context.translate(video.videoWidth, 0);
                context.scale(-1, 1);
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                context.restore(); // Restore to the default state to avoid side effects
            }
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Check image size before setting
            const base64Size = getImageSize(dataURLToBase64(dataUrl));
            if (base64Size > 4 * 1024 * 1024) {
                setCameraError(`Captured image is too large (${formatFileSize(base64Size)}). Please try with lower resolution.`);
                return;
            }

            setCapturedImage(dataUrl);
            setCameraError(null);
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
        setEditedImage(null);
        setError(null);
    };
    
    const handleGenerate = async () => {
        if (!capturedImage || !prompt) {
            setError('Please capture an image and provide a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setEditedImage(null);
        try {
            const [meta, data] = capturedImage.split(',');
            const mimeType = meta.split(';')[0].split(':')[1];
            const result = await editImage(data, mimeType, prompt);
            setEditedImage(result);

            const newContent: GeneratedContent = {
                id: new Date().toISOString(),
                type: 'image',
                prompt: `Photo Booth Edit: ${prompt}`,
                url: result,
                createdAt: new Date(),
            };
            addContentToGallery(newContent);

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred during image editing.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownload = () => {
        if (!editedImage) return;
        const link = document.createElement('a');
        link.href = editedImage;
        const safePrompt = prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `photobooth-${safePrompt}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 h-full p-6">
            <div className="w-full md:w-96 flex-shrink-0 flex flex-col gap-4 bg-neutral-950 p-4 border border-neutral-800 rounded-lg">
                <h3 className="text-xl font-bold">AI Photo Booth</h3>
                
                <div className="w-full aspect-video bg-neutral-800 rounded-lg flex items-center justify-center text-center overflow-hidden">
                   {cameraError ? (
                       <div className="p-4 text-red-400">
                           <p>{cameraError}</p>
                           <button onClick={() => setCapturedImage(null)} className="mt-4 px-4 py-2 bg-purple-600 rounded-md hover:bg-purple-700">Try Again</button>
                       </div>
                   ) : capturedImage ? (
                       <img src={capturedImage} alt="Captured" className="max-h-full max-w-full object-contain" />
                   ) : (
                       <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                   )}
                </div>
                
                {!capturedImage ? (
                    <button onClick={handleCapture} disabled={!isCameraOn || !!cameraError} className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-lg">
                        Take Picture
                    </button>
                ) : (
                    <>
                        <button onClick={handleRetake} className="w-full bg-neutral-700 text-white py-2 rounded-lg hover:bg-neutral-600">
                            Retake Picture
                        </button>
                        <div>
                            <label htmlFor="edit-prompt-photobooth" className="block text-sm font-medium text-neutral-300 mb-2">
                                Editing Prompt
                            </label>
                            <textarea
                                id="edit-prompt-photobooth"
                                rows={3}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full bg-neutral-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
                                placeholder="e.g., add futuristic sunglasses"
                            />
                        </div>
                        <button onClick={handleGenerate} disabled={isLoading || !capturedImage} className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-lg">
                            {isLoading ? 'Editing...' : 'Apply Edit'}
                        </button>
                    </>
                )}

                {error && <p className="text-red-400 mt-2">{error}</p>}
            </div>

            <div className="flex-1 bg-black rounded-lg flex items-center justify-center p-4">
                 {isLoading && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
                        <p className="text-lg text-neutral-300">Applying AI magic...</p>
                    </div>
                )}
                {!isLoading && editedImage && (
                    <div className="flex flex-col items-center justify-center gap-2 h-full w-full">
                        <img src={editedImage} alt="Edited result" className="max-h-[85%] max-w-full object-contain rounded-md" />
                         <div className="flex flex-col items-center gap-2 mt-2">
                            <span className="text-green-400 font-semibold">Saved to Gallery!</span>
                            <button
                                onClick={handleDownload}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                            >
                                Download
                            </button>
                        </div>
                    </div>
                )}
                {!isLoading && !editedImage && (
                    <div className="text-center text-neutral-500">
                        <EditIcon />
                        <p className="mt-2">Your edited photo will appear here.</p>
                    </div>
                )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default PhotoBooth;