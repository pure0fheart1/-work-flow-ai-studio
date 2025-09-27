import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { GeneratedContent } from '../../types.ts';
import { DownloadIcon, PublicGalleryIcon } from '../../components/Icons.tsx';

const FullscreenViewer: React.FC<{ item: GeneratedContent; onClose: () => void }> = ({ item, onClose }) => {
  const { shareToPublicGallery } = useAppContext();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = item.url;
    const extension = item.type === 'image' ? 'jpg' : 'mp4';
    const fileName = item.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `workflow-${fileName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative bg-neutral-900 rounded-lg p-6 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col gap-4 animate-fade-in border border-neutral-800"
        onClick={e => e.stopPropagation()}
      >
        {item.type === 'image' ? (
          <img 
            src={item.url} 
            alt={item.prompt} 
            className="flex-1 object-contain w-full h-auto min-h-0"
          />
        ) : (
          <video
            src={item.url}
            controls
            autoPlay
            loop
            className="flex-1 object-contain w-full h-auto min-h-0"
          />
        )}
        <p className="text-center text-neutral-300 italic">{item.prompt}</p>
        <div className="flex justify-center gap-4">
            <button
                onClick={handleDownload}
                className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
                <DownloadIcon className="w-5 h-5" /> Download
            </button>
             <button
                onClick={() => shareToPublicGallery(item.id)}
                disabled={!!item.isShared}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-neutral-600 disabled:cursor-not-allowed"
            >
                <PublicGalleryIcon /> {item.isShared ? 'Shared' : 'Share Publicly'}
            </button>
            <button
                onClick={onClose}
                className="px-6 py-2 bg-neutral-700 text-white font-semibold rounded-lg hover:bg-neutral-600 transition-colors"
                aria-label="Close viewer"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};

const GalleryCard: React.FC<{ item: GeneratedContent; onView: (item: GeneratedContent) => void }> = ({ item, onView }) => {
  return (
    <div 
      className="bg-neutral-800 rounded-lg overflow-hidden group relative cursor-pointer"
      onClick={() => onView(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            onView(item);
        }
      }}
    >
      {item.isShared && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold p-1.5 rounded-full z-10 flex items-center gap-1 shadow-lg" title="Shared to Public Gallery">
              <PublicGalleryIcon />
          </div>
      )}
      {item.type === 'image' ? (
        <img src={item.url} alt={item.prompt} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <video src={item.url} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" muted loop />
      )}
      <div className="absolute inset-0 bg-black bg-opacity-70 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
        <p className="text-white text-sm line-clamp-3">{item.prompt}</p>
        <p className="text-xs text-neutral-400 mt-2">{new Date(item.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

const Gallery: React.FC = () => {
  const { galleryContent } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<GeneratedContent | null>(null);

  const filteredContent = useMemo(() => {
    // Sort by creation date, newest first
    return galleryContent
      .filter(item => {
        return item.prompt.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [galleryContent, searchTerm]);

  return (
    <div className="p-6">
      <div className="mb-6 max-w-2xl mx-auto">
        <input
          type="text"
          placeholder="Search by prompt..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-neutral-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
        />
      </div>

      {filteredContent.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredContent.map(item => (
            <GalleryCard key={item.id} item={item} onView={setSelectedItem} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-xl text-neutral-500">Your gallery is empty.</p>
          <p className="text-neutral-600">Use the 'Generate' or 'Video' modules to create new content!</p>
        </div>
      )}
      {selectedItem && <FullscreenViewer item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
};

export default Gallery;