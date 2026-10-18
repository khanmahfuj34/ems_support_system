"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronRight,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck2,
} from "lucide-react";

import {
  createTicketSchema,
  type CreateTicketFormValues,
} from "../schemas/create-ticket.schema";
import type {
  TicketPriority,
  TicketAttachmentItem,
  CreateTicketResponse,
} from "../types/ticket.types";
import { DEFAULT_CATEGORIES } from "@/features/categories/constants/categories.data";
import dynamic from "next/dynamic";
import { PrioritySelector } from "./priority-selector";
import { TicketAttachments } from "./ticket-attachments";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-gray-200 bg-white min-h-[160px] p-4 text-xs text-gray-400 flex items-center justify-center">
        Loading editor...
      </div>
    ),
  },
);
import {
  createTicket,
  getTicketApiErrorMessage,
} from "../services/ticket.service";

export function CreateTicketForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [attachments, setAttachments] = useState<TicketAttachmentItem[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<CreateTicketResponse["data"] | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: "",
      categoryId: "",
      subCategoryId: "",
      priority: "MEDIUM" as TicketPriority,
      description: "",
    },
  });

  const selectedCategoryId = watch("categoryId");
  const selectedCategory = DEFAULT_CATEGORIES.find(
    (c) => c.id === selectedCategoryId,
  );
  const availableSubcategories = selectedCategory?.subCategories ?? [];

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCatId = e.target.value;
    setValue("categoryId", newCatId, { shouldValidate: true });
    setValue("subCategoryId", ""); // reset subcategory on category change
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to discard your changes?")) {
      reset();
      setAttachments([]);
      setServerError(null);
      setCreatedTicket(null);
      router.push("/dashboard");
    }
  };

  const onSubmit = (values: CreateTicketFormValues) => {
    setServerError(null);

    startTransition(async () => {
      try {
        const response = await createTicket({
          subject: values.subject,
          description: values.description,
          categoryId: values.categoryId,
          subCategoryId: values.subCategoryId || undefined,
          priority: values.priority,
        });

        setCreatedTicket(response.data);
      } catch (err) {
        const message = getTicketApiErrorMessage(
          err,
          "Failed to submit ticket request. Please verify your information and try again.",
        );
        setServerError(message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs matching design reference */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link
          href="/support-desk/new"
          className="hover:text-gray-800 transition-colors"
        >
          Support Desk
        </Link>
        <ChevronRight className="size-3.5 text-gray-400 stroke-[2.5]" />
        <span className="font-semibold text-gray-900">Create Request</span>
      </nav>

      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 tracking-tight leading-tight">
          Create Support Request
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          Describe your issue in detail so our support team can assist you better.
        </p>
      </div>

      {/* Success Banner if Ticket is Created */}
      {createdTicket && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-xs animate-in fade-in-50 duration-300">
          <div className="flex items-start gap-3.5">
            <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-emerald-900">
                Support request submitted successfully!
              </h3>
              <p className="text-xs text-emerald-700 mt-1">
                Your ticket reference number is{" "}
                <span className="font-mono font-bold">{createdTicket.ticketNumber}</span>. Our team has received your details and an SLA timeline has been assigned.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedTicket(null);
                    reset();
                    setAttachments([]);
                  }}
                  className="px-3.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-emerald-800 hover:bg-emerald-100/50 shadow-2xs transition-colors"
                >
                  Create another ticket
                </button>
                <Link
                  href="/dashboard"
                  className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 shadow-2xs transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Server Error Alert */}
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-start gap-3 animate-in fade-in-50">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-red-900">Submission Error</p>
            <p className="mt-0.5">{serverError}</p>
          </div>
          <button
            type="button"
            onClick={() => setServerError(null)}
            className="text-red-400 hover:text-red-600 p-1"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Main Request Form Container */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Subject Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="subject"
            className="block text-xs font-semibold text-gray-900"
          >
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            type="text"
            disabled={isPending}
            placeholder="Briefly describe your issue (e.g., Cannot log in to my account)"
            {...register("subject")}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 ${
              errors.subject
                ? "border-red-400 focus:ring-red-200"
                : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
            }`}
          />
          {errors.subject && (
            <p className="text-[11px] text-red-500 font-medium">
              {errors.subject.message}
            </p>
          )}
        </div>

        {/* Category & Subcategory Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <div className="space-y-1.5">
            <label
              htmlFor="category"
              className="block text-xs font-semibold text-gray-900"
            >
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="category"
                disabled={isPending}
                value={selectedCategoryId}
                onChange={handleCategoryChange}
                className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-8 text-xs text-gray-900 transition-colors focus:outline-none focus:ring-2 ${
                  errors.categoryId
                    ? "border-red-400 focus:ring-red-200"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronRight className="size-4 rotate-90 stroke-[2.5]" />
              </div>
            </div>
            {errors.categoryId && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.categoryId.message}
              </p>
            )}
          </div>

          {/* Subcategory */}
          <div className="space-y-1.5">
            <label
              htmlFor="subcategory"
              className="block text-xs font-semibold text-gray-900"
            >
              Subcategory
            </label>
            <div className="relative">
              <select
                id="subcategory"
                disabled={isPending || availableSubcategories.length === 0}
                {...register("subCategoryId")}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-8 text-xs text-gray-900 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  {availableSubcategories.length > 0
                    ? "Select a subcategory"
                    : "Select a category first"}
                </option>
                {availableSubcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronRight className="size-4 rotate-90 stroke-[2.5]" />
              </div>
            </div>
          </div>
        </div>

        {/* Priority Section */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-900">
            Priority <span className="text-red-500">*</span>
          </label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <PrioritySelector
                value={field.value}
                onChange={field.onChange}
                disabled={isPending}
              />
            )}
          />
          {errors.priority && (
            <p className="text-[11px] text-red-500 font-medium">
              {errors.priority.message}
            </p>
          )}
        </div>

        {/* Description Section with Tiptap */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-900">
            Description <span className="text-red-500">*</span>
          </label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                disabled={isPending}
                hasError={Boolean(errors.description)}
              />
            )}
          />
          {errors.description && (
            <p className="text-[11px] text-red-500 font-medium">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Attachments Section */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-900">
            Attachments
          </label>
          <TicketAttachments
            attachments={attachments}
            onChange={setAttachments}
            disabled={isPending}
          />
        </div>

        {/* Actions Row: Cancel & Submit Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            disabled={isPending}
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-2xs disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-medium transition-colors shadow-xs flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Submitting Request...</span>
              </>
            ) : (
              <>
                <Send className="size-3.5 rotate-45" />
                <span>Submit Request</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
