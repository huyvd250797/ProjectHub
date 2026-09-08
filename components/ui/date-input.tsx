"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "min" | "max"> & {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
};

type DateTimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateDisplay(value: string | null | undefined) {
  if (!value) return "";
  const dateOnly = value.slice(0, 10);
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function parseDateDisplay(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function formatDateTimeDisplay(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function parseDateTimeDisplay(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const parsed = new Date(year, month - 1, day, hour, minute);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) return null;
  return parsed.toISOString();
}

function toDateTimePickerValue(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function DateInput({ value, onChange, className, placeholder, min, max, onBlur, ...props }: DateInputProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(formatDateDisplay(value));
  const invalid = useMemo(() => parseDateDisplay(draft) === null, [draft]);

  useEffect(() => setDraft(formatDateDisplay(value)), [value]);

  function commit() {
    const parsed = parseDateDisplay(draft);
    if (parsed !== null) onChange(parsed);
    else setDraft(formatDateDisplay(value));
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker || props.disabled || props.readOnly) return;
    if ("showPicker" in picker && typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  }

  return (
    <div className="relative w-full">
      <input
        {...props}
        type="text"
        inputMode="numeric"
        value={draft}
        placeholder={placeholder ?? "DD/MM/YYYY"}
        pattern="\d{1,2}/\d{1,2}/\d{4}"
        aria-invalid={invalid || undefined}
        title={`Nhập ngày dạng DD/MM/YYYY${min ? `, từ ${formatDateDisplay(min)}` : ""}${max ? `, đến ${formatDateDisplay(max)}` : ""}`}
        className={`${className ?? ""} pr-10`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          commit();
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          props.onKeyDown?.(event);
        }}
      />
      <input
        ref={pickerRef}
        aria-hidden="true"
        tabIndex={-1}
        type="date"
        value={value ? value.slice(0, 10) : ""}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute right-2 top-1/2 size-1 -translate-y-1/2 opacity-0"
      />
      <button
        type="button"
        disabled={props.disabled}
        onClick={openPicker}
        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[0.05] hover:text-cyan-200 disabled:pointer-events-none disabled:opacity-40"
        aria-label="Chọn ngày"
      >
        <CalendarDays className="size-3.5" />
      </button>
    </div>
  );
}

export function DateTimeInput({ value, onChange, className, placeholder, onBlur, ...props }: DateTimeInputProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(formatDateTimeDisplay(value));
  const invalid = useMemo(() => parseDateTimeDisplay(draft) === null, [draft]);

  useEffect(() => setDraft(formatDateTimeDisplay(value)), [value]);

  function commit() {
    const parsed = parseDateTimeDisplay(draft);
    if (parsed !== null) onChange(parsed);
    else setDraft(formatDateTimeDisplay(value));
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker || props.disabled || props.readOnly) return;
    if ("showPicker" in picker && typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  }

  return (
    <div className="relative w-full">
      <input
        {...props}
        type="text"
        inputMode="numeric"
        value={draft}
        placeholder={placeholder ?? "DD/MM/YYYY HH:mm"}
        aria-invalid={invalid || undefined}
        title="Nhập ngày giờ dạng DD/MM/YYYY HH:mm"
        className={`${className ?? ""} pr-10`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          commit();
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          props.onKeyDown?.(event);
        }}
      />
      <input
        ref={pickerRef}
        aria-hidden="true"
        tabIndex={-1}
        type="datetime-local"
        value={toDateTimePickerValue(value)}
        onChange={(event) => onChange(event.target.value ? new Date(event.target.value).toISOString() : "")}
        className="pointer-events-none absolute right-2 top-1/2 size-1 -translate-y-1/2 opacity-0"
      />
      <button
        type="button"
        disabled={props.disabled}
        onClick={openPicker}
        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[0.05] hover:text-cyan-200 disabled:pointer-events-none disabled:opacity-40"
        aria-label="Chọn ngày giờ"
      >
        <CalendarDays className="size-3.5" />
      </button>
    </div>
  );
}

export function DateFormInput({ name, defaultValue = "", ...props }: Omit<DateInputProps, "value" | "onChange" | "defaultValue"> & { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => setValue(defaultValue), [defaultValue]);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <DateInput {...props} value={value} onChange={setValue} />
    </>
  );
}
