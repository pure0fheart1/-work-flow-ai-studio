// Image utility functions for compression and processing

export const compressImage = (file: File, maxWidth: number = 1024, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = reject;

    // Create object URL for the file
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
};

export const dataURLToBase64 = (dataURL: string): string => {
  return dataURL.split(',')[1];
};

export const getMimeType = (dataURL: string): string => {
  const match = dataURL.match(/^data:([^;]+);base64,/);
  return match ? match[1] : 'image/jpeg';
};

export const getImageSize = (base64: string): number => {
  // Calculate approximate size in bytes
  return (base64.length * 3) / 4;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};