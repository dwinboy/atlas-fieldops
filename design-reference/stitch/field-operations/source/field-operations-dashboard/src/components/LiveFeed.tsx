import React, { useState } from 'react';
import { 
  User, 
  MapPin, 
  AlertTriangle, 
  Camera, 
  CheckCircle2, 
  X,
  Plus
} from 'lucide-react';
import { FeedItem } from '../types';

interface LiveFeedProps {
  feedItems: FeedItem[];
  onLoadMore?: () => void;
}

export default function LiveFeed({ feedItems, onLoadMore }: LiveFeedProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  const getIcon = (type: string) => {
    switch (type) {
      case 'submission':
        return (
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <User className="w-5 h-5" />
          </div>
        );
      case 'route':
        return (
          <div className="w-10 h-10 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
            <MapPin className="w-5 h-5" />
          </div>
        );
      case 'error':
        return (
          <div className="w-10 h-10 rounded-full bg-brand-error-container flex items-center justify-center text-brand-error">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'assets':
        return (
          <div className="w-10 h-10 rounded-full bg-[#06B6D4]/10 flex items-center justify-center text-[#06B6D4]">
            <Camera className="w-5 h-5" />
          </div>
        );
      case 'completion':
        return (
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-surface-mid flex items-center justify-center text-text-main">
            <User className="w-5 h-5" />
          </div>
        );
    }
  };

  const loadMoreItems = () => {
    if (visibleCount < feedItems.length) {
      setVisibleCount(prev => prev + 3);
    } else {
      alert("All live logs are fully sync'd.");
    }
  };

  return (
    <aside className="bg-surface-lowest rounded-2xl border border-text-border shadow-shard h-full flex flex-col overflow-hidden">
      {/* Title Header */}
      <div className="p-6 border-b border-text-border flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-text-main">Live Field Feed</h3>
          <p className="text-[10px] text-text-outline font-semibold tracking-wider uppercase mt-0.5">
            Real-time telemetry stream
          </p>
        </div>
        <span className="flex h-2.5 w-2.5 rounded-full bg-brand-error animate-pulse" />
      </div>

      {/* Scrollable Feed List */}
      <div className="p-4 flex-1 space-y-4 max-h-[720px] overflow-y-auto scrollbar-hide">
        {feedItems.slice(0, visibleCount).map((item) => {
          const isError = item.type === 'error';
          return (
            <div
              key={item.id}
              className={`
                flex gap-4 p-4 rounded-xl bg-surface-bg border border-transparent hover:bg-surface-low/30 hover:border-text-border/75 transition-all duration-200
                ${isError ? 'border-l-4 border-l-brand-error bg-brand-error-container/10' : ''}
              `}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <p className={`text-sm font-bold ${isError ? 'text-brand-error' : 'text-text-main'}`}>
                    {item.author}
                  </p>
                  <span className="text-[10px] font-semibold text-text-outline whitespace-nowrap pl-2">
                    {item.time}
                  </span>
                </div>

                <p className="text-xs text-text-muted leading-relaxed font-medium">
                  {item.title}
                  {item.subtitle && (
                    <span className={`font-semibold ${
                      item.type === 'submission' ? 'text-brand-primary font-mono' : 
                      item.type === 'route' ? 'text-brand-secondary font-mono' : 'text-text-main'
                    }`}>
                      {item.subtitle}
                    </span>
                  )}
                  {item.extra && <span className="ml-1">{item.extra}</span>}
                </p>

                {item.requiresReview && (
                  <p className="text-[10px] font-bold text-brand-error mt-1 uppercase tracking-wide">
                    Requires supervisor review
                  </p>
                )}

                {/* Images layout if attached */}
                {item.images && item.images.length > 0 && (
                  <div className="flex gap-1.5 mt-2.5">
                    {item.images.map((img, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setSelectedImage(img)}
                        className="w-10 h-10 rounded-md overflow-hidden bg-surface-mid border border-text-border/60 cursor-zoom-in hover:brightness-90 transition-all shadow-xs"
                      >
                        <img 
                          src={img} 
                          alt="site assets" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Log Button */}
      <div className="p-4 bg-surface-low/30 border-t border-text-border">
        <button 
          onClick={loadMoreItems}
          className="w-full py-2 bg-white hover:bg-surface-low text-brand-primary border border-text-border/80 font-bold text-xs rounded-xl transition-all shadow-xs"
        >
          {visibleCount < feedItems.length ? 'Load More Activities' : 'View Full Activity Log'}
        </button>
      </div>

      {/* Image Lightbox Dialog */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-3xl max-h-4xl bg-black rounded-lg overflow-hidden shadow-2xl">
            <img 
              src={selectedImage} 
              alt="High resolution site asset" 
              className="max-w-full max-h-[80vh] object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </aside>
  );
}
