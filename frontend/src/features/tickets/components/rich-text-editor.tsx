"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  CodeXml,
  Link2,
  Image as ImageIcon,
  Undo2,
  Redo2,
  ChevronDown,
  X,
  Upload,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Explain your issue in detail. You can use formatting, add screenshots, links, or code snippets to help us understand better...",
  disabled = false,
  hasError = false,
}: RichTextEditorProps) {
  const [wordCount, setWordCount] = useState<number>(0);
  const [headingDropdownOpen, setHeadingDropdownOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: {
            class: "text-blue-600 underline font-medium cursor-pointer",
          },
        },
        underline: {},
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: "max-w-full rounded-lg my-2 border",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-400 before:float-left before:pointer-events-none before:h-0",
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] p-4 text-sm text-gray-800 outline-none max-w-none focus:outline-none prose prose-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:font-mono [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-blue-600",
        "aria-label": "Ticket description",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      const text = currentEditor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Synchronize internal editor content if external value changes (e.g. form reset)
  useEffect(() => {
    if (editor && value === "" && editor.getHTML() !== "<p></p>") {
      editor.commands.setContent("");
      setWordCount(0);
    }
  }, [value, editor]);

  // Handle outside click for heading dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setHeadingDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getCurrentHeadingLabel = useCallback(() => {
    if (!editor) return "Paragraph";
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    return "Paragraph";
  }, [editor]);

  const setHeading = (type: "p" | 1 | 2 | 3) => {
    if (!editor) return;
    if (type === "p") {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: type }).run();
    }
    setHeadingDropdownOpen(false);
  };

  const handleApplyLink = () => {
    if (!editor) return;
    if (linkUrl.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      let formattedUrl = linkUrl.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: formattedUrl })
        .run();
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
  };

  const openLinkDialog = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href ?? "";
    setLinkUrl(previousUrl);
    setLinkDialogOpen(true);
  };

  const handleApplyImageUrl = () => {
    if (!editor || imageUrl.trim() === "") return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setImageDialogOpen(false);
    setImageUrl("");
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        editor.chain().focus().setImage({ src: reader.result }).run();
        setImageDialogOpen(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div
      className={`rounded-xl border bg-white transition-all duration-200 overflow-hidden ${
        hasError
          ? "border-red-400 ring-2 ring-red-100"
          : "border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
      }`}
    >
      {/* Top Toolbar matching the reference UI */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-100 bg-white select-none">
        {/* Paragraph / Headings Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setHeadingDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <span>{getCurrentHeadingLabel()}</span>
            <ChevronDown className="size-3.5 text-gray-400" />
          </button>

          {headingDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30 animate-in fade-in-50 zoom-in-95">
              <button
                type="button"
                onClick={() => setHeading("p")}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between ${
                  editor?.isActive("paragraph") ? "font-semibold text-blue-600 bg-blue-50/50" : "text-gray-700"
                }`}
              >
                Paragraph
              </button>
              <button
                type="button"
                onClick={() => setHeading(1)}
                className={`w-full text-left px-3 py-1.5 text-sm font-bold hover:bg-gray-50 flex items-center justify-between ${
                  editor?.isActive("heading", { level: 1 }) ? "text-blue-600 bg-blue-50/50" : "text-gray-800"
                }`}
              >
                Heading 1
              </button>
              <button
                type="button"
                onClick={() => setHeading(2)}
                className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 flex items-center justify-between ${
                  editor?.isActive("heading", { level: 2 }) ? "text-blue-600 bg-blue-50/50" : "text-gray-800"
                }`}
              >
                Heading 2
              </button>
              <button
                type="button"
                onClick={() => setHeading(3)}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center justify-between ${
                  editor?.isActive("heading", { level: 3 }) ? "text-blue-600 bg-blue-50/50" : "text-gray-800"
                }`}
              >
                Heading 3
              </button>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-4 w-[1px] bg-gray-200 mx-1" aria-hidden="true" />

        {/* Bold */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`size-7 flex items-center justify-center rounded-md font-bold text-xs transition-colors ${
            editor?.isActive("bold")
              ? "bg-blue-100 text-blue-700 font-extrabold"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="size-3.5 stroke-[2.5]" />
        </button>

        {/* Italic */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`size-7 flex items-center justify-center rounded-md text-xs italic transition-colors ${
            editor?.isActive("italic")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="size-3.5" />
        </button>

        {/* Underline */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`size-7 flex items-center justify-center rounded-md text-xs transition-colors ${
            editor?.isActive("underline")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="size-3.5" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          className={`size-7 flex items-center justify-center rounded-md text-xs transition-colors ${
            editor?.isActive("strike")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="size-3.5" />
        </button>

        {/* Separator */}
        <div className="h-4 w-[1px] bg-gray-200 mx-1" aria-hidden="true" />

        {/* Bullet List */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`size-7 flex items-center justify-center rounded-md transition-colors ${
            editor?.isActive("bulletList")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Bullet List"
        >
          <List className="size-3.5" />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`size-7 flex items-center justify-center rounded-md transition-colors ${
            editor?.isActive("orderedList")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Numbered List"
        >
          <ListOrdered className="size-3.5" />
        </button>

        {/* Quote */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={`size-7 flex items-center justify-center rounded-md transition-colors ${
            editor?.isActive("blockquote")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Blockquote"
        >
          <Quote className="size-3.5" />
        </button>

        {/* Code Block */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          className={`size-7 flex items-center justify-center rounded-md transition-colors ${
            editor?.isActive("codeBlock")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Code Block"
        >
          <CodeXml className="size-3.5" />
        </button>

        {/* Link */}
        <button
          type="button"
          disabled={disabled}
          onClick={openLinkDialog}
          className={`size-7 flex items-center justify-center rounded-md transition-colors ${
            editor?.isActive("link")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Insert Link"
        >
          <Link2 className="size-3.5" />
        </button>

        {/* Image */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setImageDialogOpen(true)}
          className="size-7 flex items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
          title="Insert Image"
        >
          <ImageIcon className="size-3.5" />
        </button>

        {/* Separator */}
        <div className="h-4 w-[1px] bg-gray-200 mx-1" aria-hidden="true" />

        {/* Undo */}
        <button
          type="button"
          disabled={disabled || !editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
          className="size-7 flex items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="size-3.5" />
        </button>

        {/* Redo */}
        <button
          type="button"
          disabled={disabled || !editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
          className="size-7 flex items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="size-3.5" />
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="relative bg-white cursor-text" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>

      {/* Bottom Footer: Word Count */}
      <div className="flex items-center justify-end px-4 py-1.5 border-t border-gray-100 bg-white text-right">
        <span className="text-xs text-gray-400 font-normal">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
      </div>

      {/* Link Dialog Modal */}
      {linkDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-900">Insert Link</h3>
              <button
                type="button"
                onClick={() => setLinkDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="size-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyLink();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLinkDialogOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyLink}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Dialog Modal */}
      {imageDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-900">Insert Image</h3>
              <button
                type="button"
                onClick={() => setImageDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-gray-200" />
                <span className="shrink mx-2 text-[11px] text-gray-400">or upload from device</span>
                <div className="grow border-t border-gray-200" />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Upload className="size-3.5 text-blue-600" />
                Browse computer for image
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setImageDialogOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyImageUrl}
                disabled={imageUrl.trim() === ""}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
