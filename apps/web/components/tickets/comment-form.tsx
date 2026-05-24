"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RichTextEditor } from "./rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  commentSchema,
  CommentFormData,
} from "@/lib/validations/comment.schema";
import { createClient } from "@/lib/supabase/client";
import { createComment } from "@/lib/supabase/queries/comments";
import { uploadCommentImage } from "@/lib/supabase/queries/comments";
import { Loader2 } from "lucide-react";
import { useToast } from "@/lib/hooks/use-toast";

interface CommentFormProps {
  ticketId: string;
  onCommentCreated: () => void;
  onCancel?: () => void;
}

export function CommentForm({
  ticketId,
  onCommentCreated,
  onCancel,
}: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
      time_worked_minutes: 0,
      is_internal: false,
    },
  });

  const supabase = createClient();

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const url = await uploadCommentImage(supabase, file, ticketId);
      return url;
    } catch (error) {
      console.error("Failed to upload image:", error);
      throw error;
    }
  };

  const onSubmit = async (data: CommentFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await createComment(supabase, {
        ticket_id: ticketId,
        content: data.content,
        time_worked_minutes: data.time_worked_minutes,
        is_internal: data.is_internal,
      });

      reset();
      setContent("");
      onCommentCreated();

      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully.",
      });
    } catch (err) {
      console.error("Failed to create comment:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create comment";
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setValue("content", newContent, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Comment input section with bubble-style background */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
        <Label htmlFor="comment-content" className="sr-only">
          Comment content
        </Label>
        <RichTextEditor
          content={content}
          onChange={handleContentChange}
          onImageUpload={handleImageUpload}
          placeholder="Add a comment..."
          disabled={isSubmitting}
          className="border-0"
        />
      </div>
      {errors.content && (
        <p className="text-sm text-red-500 mt-1" role="alert">
          {errors.content.message}
        </p>
      )}

      {error && (
        <div
          className="text-sm text-red-500 bg-red-50 p-3 rounded-lg"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 justify-between flex-wrap">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="time_worked"
            className="text-sm font-medium whitespace-nowrap"
          >
            Time Worked (min)
          </Label>
          <Input
            id="time_worked"
            type="number"
            min="0"
            max="999"
            {...register("time_worked_minutes", { valueAsNumber: true })}
            placeholder="0"
            disabled={isSubmitting}
            className="w-20"
            aria-describedby={
              errors.time_worked_minutes ? "time-error" : undefined
            }
          />
          {errors.time_worked_minutes && (
            <p id="time-error" className="text-sm text-red-500" role="alert">
              {errors.time_worked_minutes.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post Comment"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
