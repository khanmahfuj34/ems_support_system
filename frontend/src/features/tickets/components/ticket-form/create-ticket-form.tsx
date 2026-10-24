"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronRight,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

import {
  createTicketSchema,
  type CreateTicketFormValues,
} from "../../schemas/create-ticket.schema";
import type { TicketPriority, CreateTicketResponse } from "../../types/ticket.types";
import { createTicket } from "../../services/ticket.service";
import { useTicketCategoryOptions } from "../../hooks/use-ticket-category-options";
import { useAttachmentBatch } from "@/features/attachments/hooks/use-attachment-batch";
import { getApiErrorMessage } from "@/lib/api/api-errors";
import { PrioritySelector } from "./priority-selector";
import { TicketAttachments } from "@/features/attachments/components/ticket-attachments";
import { RichTextContent } from "../rich-text-content";
import { useToast } from "@/components/ui/toaster";

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

export function CreateTicketForm() {
  const router = useRouter();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<"creating" | "uploading" | null>(null);
  const submitLock = useRef(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<CreateTicketResponse["data"] | null>(null);

  const {
    register,
    handleSubmit,
    control,
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

  const selectedCategoryId = useWatch({ control, name: "categoryId", defaultValue: "" });
  const {
    categories,
    categoriesLoading,
    categoriesError,
    refreshCategories,
    subcategories,
    subcategoriesLoading,
    subcategoriesError,
    refreshSubcategories,
    resetSubcategories,
    prepareSubcategories,
  } = useTicketCategoryOptions(selectedCategoryId);
  const {
    attachments,
    setAttachments,
    hasPendingAttachments,
    uploadPendingAttachments,
  } = useAttachmentBatch();

  const ticketFormLocked = isSubmitting || createdTicket !== null;

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCatId = e.target.value;
    setValue("categoryId", newCatId, { shouldValidate: true });
    setValue("subCategoryId", "", { shouldValidate: true });
    resetSubcategories();
    if (newCatId) prepareSubcategories();
  };

  const resetTicketForm = () => {
    reset();
    setAttachments([]);
    resetSubcategories();
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to discard your changes?")) {
      resetTicketForm();
      setServerError(null);
      setCreatedTicket(null);
      router.push("/dashboard");
    }
  };

  const onSubmit = async (values: CreateTicketFormValues) => {
    setIsSubmitting(true);
    setSubmissionStage(createdTicket ? "uploading" : "creating");
    setServerError(null);

    try {
      let ticket = createdTicket;
      if (!ticket) {
        const response = await createTicket({
          subject: values.subject,
          description: values.description,
          categoryId: values.categoryId,
          subCategoryId: values.subCategoryId || undefined,
          priority: values.priority,
        });

        ticket = response.data;
        setCreatedTicket(ticket);
      }

      const filesToUpload = attachments.filter((file) => file.uploadStatus !== "uploaded");
      if (filesToUpload.length > 0) {
        setSubmissionStage("uploading");
        const uploadsSucceeded = await uploadPendingAttachments(ticket.id, filesToUpload);
        if (!uploadsSucceeded) {
          const message = `Ticket ${ticket.ticketNumber} was created, but one or more attachments failed to upload. Retry the failed uploads below.`;
          setServerError(message);
          showErrorToast({ title: "Attachment upload failed", description: message });
          return;
        }
      }

      // Uploads are already associated with this ticket by the existing API.
      // Reset only after every selected attachment has uploaded successfully.
      resetTicketForm();

      if (ticket?.ticketNumber) {
        showSuccessToast({
          title: "Support request submitted",
          description: `Ticket ${ticket.ticketNumber} was received and an SLA timeline has been assigned.`,
        });
      } else {
        showSuccessToast({ title: "Support request submitted" });
      }
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Failed to submit ticket request. Please verify your information and try again.",
      );
      setServerError(message);
      showErrorToast({ title: "Submission failed", description: message });
    } finally {
      setIsSubmitting(false);
      setSubmissionStage(null);
    }
  };

  const handleFormSubmit = handleSubmit(onSubmit);
  const handleFormSubmitEvent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitLock.current) return;

    submitLock.current = true;
    void handleFormSubmit(event).finally(() => {
      submitLock.current = false;
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
        <div className={`rounded-xl border p-5 shadow-xs animate-in fade-in-50 duration-300 ${hasPendingAttachments ? "border-amber-200 bg-amber-50/80" : "border-emerald-200 bg-emerald-50/80"}`}>
          <div className="flex items-start gap-3.5">
            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${hasPendingAttachments ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-600"}`}>
              {hasPendingAttachments ? <AlertCircle className="size-5" /> : <CheckCircle2 className="size-5" />}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-sm ${hasPendingAttachments ? "text-amber-900" : "text-emerald-900"}`}>
                {hasPendingAttachments ? "Ticket created; attachment uploads need attention" : "Support request submitted successfully!"}
              </h3>
              <p className={`text-xs mt-1 ${hasPendingAttachments ? "text-amber-800" : "text-emerald-700"}`}>
                {hasPendingAttachments ? "Selected attachments are not all uploaded. Retry failed uploads below. Ticket reference: " : "Your ticket reference number is "}{" "}
                <span className="font-mono font-bold">{createdTicket.ticketNumber || "—"}</span>. Our team has received your details and an SLA timeline has been assigned.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedTicket(null);
                    setServerError(null);
                    resetTicketForm();
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
              {createdTicket.description != null && createdTicket.description !== "" && createdTicket.description !== "<p></p>" && (
                <div className="mt-4 pt-4 border-t border-gray-200/70">
                  <p className="text-xs font-semibold text-gray-700">Saved description</p>
                  <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg bg-gray-50/80 border border-gray-100 px-3.5 py-2.5">
                    {/* Rendered via DOMPurify — saved content is never injected raw. */}
                    <RichTextContent html={createdTicket.description} />
                  </div>
                </div>
              )}
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
      <form onSubmit={handleFormSubmitEvent} className="space-y-6">
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
            disabled={ticketFormLocked}
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
                disabled={Boolean(ticketFormLocked || categoriesLoading || categoriesError || categories.length === 0)}
                value={selectedCategoryId}
                onChange={handleCategoryChange}
                className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-8 text-xs text-gray-900 transition-colors focus:outline-none focus:ring-2 ${
                  errors.categoryId
                    ? "border-red-400 focus:ring-red-200"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              >
                <option value="" disabled>
                  {categoriesLoading
                    ? "Loading categories..."
                    : categoriesError
                      ? "Categories unavailable"
                      : categories.length === 0
                        ? "No active categories available"
                        : "Select a category"}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronRight className="size-4 rotate-90 stroke-[2.5]" />
              </div>
            </div>
            {categoriesError && (
              <div className="flex items-center justify-between gap-2 text-[11px] text-red-600" role="alert">
                <span>{categoriesError}</span>
                <button
                  type="button"
                  onClick={refreshCategories}
                  className="shrink-0 font-semibold underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}
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
                disabled={Boolean(ticketFormLocked || !selectedCategoryId || subcategoriesLoading || subcategoriesError || subcategories.length === 0)}
                {...register("subCategoryId")}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-8 text-xs text-gray-900 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  {!selectedCategoryId
                    ? "Select a category first"
                    : subcategoriesLoading
                      ? "Loading subcategories..."
                      : subcategoriesError
                        ? "Subcategories unavailable"
                        : subcategories.length > 0
                          ? "Select a subcategory"
                          : "No subcategories available"}
                </option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronRight className="size-4 rotate-90 stroke-[2.5]" />
              </div>
            </div>
            {subcategoriesError && (
              <div className="flex items-center justify-between gap-2 text-[11px] text-red-600" role="alert">
                <span>{subcategoriesError}</span>
                <button
                  type="button"
                  onClick={refreshSubcategories}
                  className="shrink-0 font-semibold underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}
            {!subcategoriesLoading && !subcategoriesError && selectedCategoryId && subcategories.length === 0 && (
              <p className="text-[11px] text-gray-500" role="status">No active subcategories for this category.</p>
            )}
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
                disabled={ticketFormLocked}
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
                disabled={ticketFormLocked}
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
            disabled={isSubmitting || (createdTicket !== null && !hasPendingAttachments)}
          />
        </div>

        {/* Actions Row: Cancel & Submit Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            disabled={isSubmitting || (createdTicket !== null && !hasPendingAttachments)}
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-2xs disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-medium transition-colors shadow-xs flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>{submissionStage === "uploading" ? "Uploading Attachments..." : "Submitting Request..."}</span>
              </>
            ) : (
              <>
                <Send className="size-3.5 rotate-45" />
                <span>
                  {createdTicket
                    ? hasPendingAttachments
                      ? "Retry Attachment Uploads"
                      : "Ticket Created"
                    : "Submit Request"}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
