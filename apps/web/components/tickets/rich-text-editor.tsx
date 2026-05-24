"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Heading from "@tiptap/extension-heading";
import Blockquote from "@tiptap/extension-blockquote";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { ResizableImage } from "./tiptap-resizable-image";
import { createLowlight, common } from "lowlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Undo,
  Redo,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MenuBar = ({
  editor,
  onImageUpload,
  disabled,
}: {
  editor: Editor | null;
  onImageUpload?: (file: File) => Promise<string>;
  disabled?: boolean;
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = useCallback(async () => {
    if (!editor || !onImageUpload) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setIsUploading(true);
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (error) {
        console.error("Failed to upload image:", error);
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 p-2 bg-gray-50">
      {/* Undo/Redo */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={disabled || !editor.can().chain().focus().undo().run()}
        className="h-8 w-8 p-0"
        aria-label="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={disabled || !editor.can().chain().focus().redo().run()}
        className="h-8 w-8 p-0"
        aria-label="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Text Formatting */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={disabled || !editor.can().chain().focus().toggleBold().run()}
        className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-gray-200")}
        aria-label="Toggle bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={
          disabled || !editor.can().chain().focus().toggleItalic().run()
        }
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("italic") && "bg-gray-200"
        )}
        aria-label="Toggle italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={
          disabled || !editor.can().chain().focus().toggleUnderline().run()
        }
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("underline") && "bg-gray-200"
        )}
        aria-label="Toggle underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={
          disabled || !editor.can().chain().focus().toggleStrike().run()
        }
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("strike") && "bg-gray-200"
        )}
        aria-label="Toggle strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Headings */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        disabled={
          disabled ||
          !editor.can().chain().focus().toggleHeading({ level: 1 }).run()
        }
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("heading", { level: 1 }) && "bg-gray-200"
        )}
        aria-label="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        disabled={
          disabled ||
          !editor.can().chain().focus().toggleHeading({ level: 2 }).run()
        }
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("heading", { level: 2 }) && "bg-gray-200"
        )}
        aria-label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        disabled={
          disabled ||
          !editor.can().chain().focus().toggleHeading({ level: 3 }).run()
        }
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("heading", { level: 3 }) && "bg-gray-200"
        )}
        aria-label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Lists */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={
          disabled || !editor.can().chain().focus().toggleBulletList().run()
        }
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("bulletList") && "bg-gray-200"
        )}
        aria-label="Toggle bullet list"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        disabled={
          disabled || !editor.can().chain().focus().toggleOrderedList().run()
        }
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("orderedList") && "bg-gray-200"
        )}
        aria-label="Toggle ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Blockquote & HR */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={
          disabled || !editor.can().chain().focus().toggleBlockquote().run()
        }
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("blockquote") && "bg-gray-200"
        )}
        aria-label="Toggle blockquote"
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        disabled={disabled}
        className="h-8 w-8 p-0"
        aria-label="Insert horizontal rule"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Code Block */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        disabled={
          disabled || !editor.can().chain().focus().toggleCodeBlock().run()
        }
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive("codeBlock") && "bg-gray-200"
        )}
        aria-label="Toggle code block"
      >
        <Code className="h-4 w-4" />
      </Button>

      {/* Image Upload */}
      {onImageUpload && (
        <>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleImageUpload}
            disabled={disabled || isUploading}
            className="h-8 w-8 p-0"
            aria-label="Upload image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
};

export function RichTextEditor({
  content,
  onChange,
  onImageUpload,
  placeholder = "Write your comment...",
  className,
  disabled = false,
}: RichTextEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const lowlightInstance = createLowlight(common);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        heading: false, // Disable so we can use custom heading extension
        blockquote: false, // Disable so we can use custom blockquote extension
        horizontalRule: false, // Disable so we can use custom horizontalRule extension
        codeBlock: false, // Disable so we can use CodeBlockLowlight
        strike: false, // Disable so we can use custom strike extension
        bulletList: false, // Disable so we can use custom bulletList extension
        orderedList: false, // Disable so we can use custom orderedList extension
        listItem: false, // Disable so we can use custom listItem extension
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Underline,
      Strike,
      Blockquote,
      HorizontalRule,
      BulletList,
      OrderedList,
      ListItem,
      Placeholder.configure({
        placeholder,
      }),
      CodeBlockLowlight.configure({
        lowlight: lowlightInstance,
      }),
      ResizableImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-lg cursor-pointer",
          style: "max-width: 100%; height: auto;",
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !disabled,
  });

  // Add drag-to-resize functionality to images
  useEffect(() => {
    if (!editorRef.current || disabled) return;

    let isResizing = false;
    let currentImg: HTMLImageElement | null = null;
    let startX = 0;
    let startWidth = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && currentImg) {
        e.preventDefault();
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(
          50,
          Math.min(startWidth + deltaX, currentImg.naturalWidth)
        );

        currentImg.style.width = `${newWidth}px`;
        currentImg.style.height = "auto";
        return;
      }

      // Update cursor based on position
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        const edgeThreshold = 15;

        const distanceFromRight = rect.right - e.clientX;
        const distanceFromLeft = e.clientX - rect.left;

        if (
          distanceFromRight <= edgeThreshold ||
          distanceFromLeft <= edgeThreshold
        ) {
          img.style.cursor = "ew-resize";
        } else {
          img.style.cursor = "default";
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        const edgeThreshold = 15;

        const distanceFromRight = rect.right - e.clientX;
        const distanceFromLeft = e.clientX - rect.left;

        if (
          distanceFromRight <= edgeThreshold ||
          distanceFromLeft <= edgeThreshold
        ) {
          e.preventDefault();
          e.stopPropagation();
          isResizing = true;
          currentImg = img;
          startX = e.clientX;
          startWidth = img.offsetWidth;

          img.style.opacity = "0.7";
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing && currentImg) {
        currentImg.style.opacity = "1";
        currentImg.setAttribute("width", currentImg.offsetWidth.toString());
      }
      isResizing = false;
      currentImg = null;
    };

    const editorElement = editorRef.current.querySelector(".ProseMirror");
    if (editorElement) {
      editorElement.addEventListener(
        "mousedown",
        handleMouseDown as EventListener
      );
      editorElement.addEventListener(
        "mousemove",
        handleMouseMove as EventListener
      );
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      if (editorElement) {
        editorElement.removeEventListener(
          "mousedown",
          handleMouseDown as EventListener
        );
        editorElement.removeEventListener(
          "mousemove",
          handleMouseMove as EventListener
        );
      }
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [editor, disabled]);

  return (
    <div
      ref={editorRef}
      className={cn("border rounded-lg overflow-hidden", className)}
    >
      <MenuBar
        editor={editor}
        onImageUpload={onImageUpload}
        disabled={disabled}
      />
      <div className="relative">
        {showPreview ? (
          <div className="prose prose-sm max-w-none min-h-[150px] p-4 bg-white">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {editor?.getText() || ""}
            </ReactMarkdown>
          </div>
        ) : (
          <EditorContent editor={editor} className="bg-white" />
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="absolute top-2 right-2 h-8 w-8 p-0"
          aria-label={showPreview ? "Hide preview" : "Show preview"}
          disabled={disabled}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
