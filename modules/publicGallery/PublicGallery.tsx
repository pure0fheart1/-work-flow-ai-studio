import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { GeneratedContent } from '../../types.ts';
import { DownloadIcon, TrashIcon } from '../../components/Icons.tsx';

const FullscreenViewer: React.FC<{ item: GeneratedContent; onClose: () => void }> = ({ item, onClose }) => {
  const { removeFromPublicGallery } = useAppContext();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = item.url;
    const extension = item.type === 'image' ? 'jpg' : 'mp4';
    const fileName = item.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `workflow-public-${fileName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      removeFromPublicGallery(item.id);
      onClose();
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
                onClick={handleRemove}
                className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
                <TrashIcon className="w-5 h-5" /> Un-share
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

const PublicGalleryCard: React.FC<{ item: GeneratedContent; onView: (item: GeneratedContent) => void }> = ({ item, onView }) => {
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

const PublicGallery: React.FC = () => {
  const { publicGalleryContent } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<GeneratedContent | null>(null);

  const filteredContent = useMemo(() => {
    return publicGalleryContent
      .filter(item => {
        return item.prompt.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [publicGalleryContent, searchTerm]);

  return (
    <div className="p-6">
      <div className="mb-6 max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-2">Public Gallery</h2>
        <p className="text-neutral-400 mb-4">Creations shared by the community. (Simulated)</p>
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
            <PublicGalleryCard key={item.id} item={item} onView={setSelectedItem} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-xl text-neutral-500">The public gallery is empty.</p>
          <p className="text-neutral-600">Go to your private gallery to share your creations!</p>
        </div>
      )}
      {selectedItem && <FullscreenViewer item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
};

export default PublicGallery;
