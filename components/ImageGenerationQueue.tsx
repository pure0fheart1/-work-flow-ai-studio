import React from 'react';
import { TrashIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from './Icons.tsx';

// The parent component (ImageGenerator) will define the concrete type.
// This interface documents the shape the component expects.
type QueueItemStatus = 'queued' | 'generating' | 'done' | 'error' | 'cancelled';

interface QueueItem {
  id: string;
  prompt: string;
  aspectRatio: string;
  status: QueueItemStatus;
}

interface ImageGenerationQueueProps {
  queue: QueueItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onCancel: (id: string) => void;
}

const StatusIndicator: React.FC<{ status: QueueItemStatus }> = ({ status }) => {
  switch (status) {
    case 'queued':
      return <div title="Queued" className="flex items-center gap-2 text-neutral-400"><ClockIcon className="w-4 h-4" /> Queued</div>;
    case 'generating':
      return (
        <div title="Generating..." className="flex items-center gap-2 text-purple-400">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          Generating
        </div>
      );
    case 'done':
      return <div title="Done" className="flex items-center gap-2 text-green-400"><CheckCircleIcon className="w-4 h-4" /> Done</div>;
    case 'error':
      return <div title="Error" className="flex items-center gap-2 text-red-400"><XCircleIcon className="w-4 h-4" /> Error</div>;
    case 'cancelled':
      return <div title="Cancelled" className="flex items-center gap-2 text-neutral-500">Cancelled</div>;
    default:
      return null;
  }
};

export const ImageGenerationQueue: React.FC<ImageGenerationQueueProps> = ({ queue, onRemove, onClear, onCancel }) => {
  if (queue.length === 0) {
    return null; // Don't render anything if the queue is empty
  }

  return (
    <div className="mt-4 p-4 bg-neutral-900 rounded-lg border border-neutral-800">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-lg">Generation Queue</h4>
        <button
          onClick={onClear}
          className="text-sm text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          <TrashIcon className="w-4 h-4" /> Clear All
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
        {queue.map((item) => (
          <div key={item.id} className="bg-neutral-800 p-3 rounded-md flex justify-between items-center text-sm animate-fade-in">
            <div className="flex-1 truncate pr-4">
              <p className="text-neutral-200 truncate" title={item.prompt}>{item.prompt}</p>
              <p className="text-xs text-neutral-400">Aspect Ratio: {item.aspectRatio}</p>
            </div>
            <div className="flex items-center gap-4">
                <StatusIndicator status={item.status} />
                {item.status === 'generating' ? (
                  <button
                    onClick={() => onCancel(item.id)}
                    className="text-red-400 hover:text-red-300 transition-colors font-semibold w-16 text-center"
                    title="Cancel generation"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-neutral-500 hover:text-red-400 transition-colors w-16 flex justify-center"
                    title="Remove from queue"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};