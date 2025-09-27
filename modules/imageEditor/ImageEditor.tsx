import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { editImage } from '../../services/geminiService.ts';
import { EditIcon } from '../../components/Icons.tsx';
import { GeneratedContent } from '../../types.ts';
import { compressImage, dataURLToBase64, getMimeType, getImageSize, formatFileSize } from '../../utils/imageUtils.ts';

const ImageEditor: React.FC = () => {
    const { imageForEditor, setImageForEditor, addContentToGallery } = useAppContext();
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('make the background a cyberpunk city');
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isSaved, setIsSaved] = useState(false);


    useEffect(() => {
        if (imageForEditor) {
            setSourceImage(imageForEditor);
            setEditedImage(null); // Clear previous edit
            setImageForEditor(null); // Consume the image from context
        }
    }, [imageForEditor, setImageForEditor]);
    
    const handleFileSelect = async (file: File) => {
        if (file && file.type.startsWith('image/')) {
            try {
                // Compress image before setting
                const compressedDataUrl = await compressImage(file, 1024, 0.8);
                const base64Size = getImageSize(dataURLToBase64(compressedDataUrl));

                // Check if still too large after compression
                if (base64Size > 4 * 1024 * 1024) {
                    setError(`Image is still too large after compression (${formatFileSize(base64Size)}). Please use a smaller image.`);
                    return;
                }

                setSourceImage(compressedDataUrl);
                setEditedImage(null);
                setIsSaved(false);
                setError(null);
            } catch (err) {
                setError('Failed to process image. Please try a different image.');
            }
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
           handleFileSelect(file);
        }
    };
    
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    
    const handleGenerate = async () => {
        if (!sourceImage || !prompt) {
            setError('Please provide a source image and a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setEditedImage(null);
        setIsSaved(false);
        try {
            const [meta, data] = sourceImage.split(',');
            const mimeType = meta.split(';')[0].split(':')[1];
            const result = await editImage(data, mimeType, prompt);
            setEditedImage(result);

            const newContent: GeneratedContent = {
                id: new Date().toISOString(),
                type: 'image',
                prompt: `Image Edit: ${prompt}`,
                url: result,
                createdAt: new Date(),
            };
            addContentToGallery(newContent);
            setIsSaved(true);

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
        link.download = `edited-${safePrompt}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 h-full p-6">
            <div className="w-full md:w-96 flex-shrink-0 flex flex-col gap-4 bg-neutral-950 p-4 border border-neutral-800 rounded-lg">
                <h3 className="text-xl font-bold">AI Image Editor</h3>
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Source Image</label>
                    <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`w-full aspect-square bg-neutral-800 rounded-lg flex items-center justify-center text-center transition-colors ${isDraggingOver ? 'border-2 border-dashed border-purple-500 bg-neutral-700' : 'border-2 border-transparent'}`}
                    >
                       {sourceImage ? (
                           <img src={sourceImage} alt="Source" className="max-h-full max-w-full object-contain rounded-md" />
                       ) : (
                           <p className="text-neutral-400 px-4">Click button below or drag & drop an image here</p>
                       )}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full mt-2 bg-neutral-700 text-white py-2 rounded-lg hover:bg-neutral-600">
                        Upload Image
                    </button>
                </div>
                <div>
                    <label htmlFor="edit-prompt" className="block text-sm font-medium text-neutral-300 mb-2">
                        Editing Prompt
                    </label>
                    <textarea
                        id="edit-prompt"
                        rows={4}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-neutral-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
                        placeholder="e.g., add a hat on the cat"
                    />
                </div>
                <button onClick={handleGenerate} disabled={isLoading || !sourceImage} className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-lg">
                    {isLoading ? 'Editing...' : 'Apply Edit'}
                </button>
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
                        <div className="flex items-center gap-4 mt-2">
                            {isSaved && <span className="text-green-400 font-semibold py-2">Saved to Gallery!</span>}
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
                        <p className="mt-2">Your edited image will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageEditor;