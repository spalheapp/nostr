
import React from 'react';
import { MessageCircle, Repeat2, Heart, Share, MoreHorizontal } from 'lucide-react';
import { FeedPost } from '../types';

interface PostCardProps {
  post: FeedPost;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const timeAgo = (timestamp: number) => {
    const diff = Math.floor(Date.now() / 1000) - timestamp;
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <article className="p-4 border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors cursor-pointer group">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <img 
            src={post.user?.picture || `https://picsum.photos/seed/${post.pubkey}/128/128`} 
            className="w-12 h-12 rounded-full border border-slate-800"
            alt="User"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1 overflow-hidden">
              <span className="font-bold text-slate-100 truncate hover:underline">
                {post.user?.display_name || 'Anon'}
              </span>
              <span className="text-slate-500 text-sm truncate">
                @{post.pubkey.substring(0, 8)}...
              </span>
              <span className="text-slate-500 text-sm flex-shrink-0">· {timeAgo(post.created_at)}</span>
            </div>
            <button className="text-slate-500 hover:text-blue-400 p-1.5 rounded-full hover:bg-blue-400/10 transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
          
          <p className="text-slate-200 leading-relaxed mb-3 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          <div className="flex items-center justify-between text-slate-500 max-w-md">
            <button className="flex items-center gap-2 group/btn hover:text-blue-400 transition-colors">
              <div className="p-2 group-hover/btn:bg-blue-400/10 rounded-full">
                <MessageCircle size={18} />
              </div>
              <span className="text-sm">12</span>
            </button>
            <button className="flex items-center gap-2 group/btn hover:text-green-400 transition-colors">
              <div className="p-2 group-hover/btn:bg-green-400/10 rounded-full">
                <Repeat2 size={18} />
              </div>
              <span className="text-sm">5</span>
            </button>
            <button className="flex items-center gap-2 group/btn hover:text-rose-400 transition-colors">
              <div className="p-2 group-hover/btn:bg-rose-400/10 rounded-full">
                <Heart size={18} />
              </div>
              <span className="text-sm">48</span>
            </button>
            <button className="flex items-center gap-2 group/btn hover:text-blue-400 transition-colors">
              <div className="p-2 group-hover/btn:bg-blue-400/10 rounded-full">
                <Share size={18} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
