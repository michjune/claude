'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar } from '@/components/ui/avatar';
import { MessageCircle, Reply, Send } from 'lucide-react';

interface Comment {
  id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null };
}

interface CommentSectionProps {
  contentId: string;
}

export function CommentSection({ contentId }: CommentSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', contentId],
    queryFn: async () => {
      const res = await fetch(`/api/blog/comments?contentId=${contentId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const postComment = useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId?: string }) => {
      const res = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, body, parentId }),
      });
      if (!res.ok) throw new Error('Failed to post comment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', contentId] });
      setNewComment('');
      setReplyText('');
      setReplyingTo(null);
    },
  });

  const topLevel = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const renderComment = (comment: Comment, depth = 0) => (
    <div key={comment.id} className={`${depth > 0 ? 'ml-8 border-l pl-4' : ''}`}>
      <div className="flex gap-3 py-3">
        <Avatar
          alt={comment.profiles?.full_name || 'User'}
          src={comment.profiles?.avatar_url || undefined}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {comment.profiles?.full_name || 'Anonymous'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm mt-1">{comment.body}</p>
          {user && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          )}
          {replyingTo === comment.id && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && replyText.trim()) {
                    postComment.mutate({ body: replyText, parentId: comment.id });
                  }
                }}
              />
              <button
                onClick={() => replyText.trim() && postComment.mutate({ body: replyText, parentId: comment.id })}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-8 w-8"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      {getReplies(comment.id).map((reply) => renderComment(reply, depth + 1))}
    </div>
  );

  return (
    <div className="mt-8 border-t pt-8">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        Comments ({comments.length})
      </h3>

      {user && (
        <div className="flex gap-3 mt-4">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newComment.trim()) {
                postComment.mutate({ body: newComment });
              }
            }}
          />
          <button
            onClick={() => newComment.trim() && postComment.mutate({ body: newComment })}
            disabled={postComment.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Post
          </button>
        </div>
      )}

      {!user && (
        <p className="mt-4 text-sm text-muted-foreground">
          <a href="/login" className="text-primary hover:underline">Sign in</a> to leave a comment.
        </p>
      )}

      <div className="mt-4 divide-y">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading comments...</p>
        ) : topLevel.length > 0 ? (
          topLevel.map((comment) => renderComment(comment))
        ) : (
          <p className="text-sm text-muted-foreground py-4">No comments yet. Be the first to share your thoughts!</p>
        )}
      </div>
    </div>
  );
}
