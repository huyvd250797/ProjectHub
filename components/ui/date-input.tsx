"use client";

import { useEffect, useMemo, useState } from "react";
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

export function DateInput({ value, onChange, className, placeholder, min, max, onBlur, ...props }: DateInputProps) {
  const [draft, setDraft] = useState(formatDateDisplay(value));
  const invalid = useMemo(() => parseDateDisplay(draft) === null, [draft]);

  useEffect(() => setDraft(formatDateDisplay(value)), [value]);

  function commit() {
    const parsed = parseDateDisplay(draft);
    if (parsed !== null) onChange(parsed);
    else setDraft(formatDateDisplay(value));
  }

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={draft}
      placeholder={placeholder ?? "DD/MM/YYYY"}
      pattern="\d{1,2}/\d{1,2}/\d{4}"
      aria-invalid={invalid || undefined}
      title={`Nhập ngày dạng DD/MM/YYYY${min ? `, từ ${formatDateDisplay(min)}` : ""}${max ? `, đến ${formatDateDisplay(max)}` : ""}`}
      className={className}
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
  );
}

export function DateTimeInput({ value, onChange, className, placeholder, onBlur, ...props }: DateTimeInputProps) {
  const [draft, setDraft] = useState(formatDateTimeDisplay(value));
  const invalid = useMemo(() => parseDateTimeDisplay(draft) === null, [draft]);

  useEffect(() => setDraft(formatDateTimeDisplay(value)), [value]);

  function commit() {
    const parsed = parseDateTimeDisplay(draft);
    if (parsed !== null) onChange(parsed);
    else setDraft(formatDateTimeDisplay(value));
  }

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={draft}
      placeholder={placeholder ?? "DD/MM/YYYY HH:mm"}
      aria-invalid={invalid || undefined}
      title="Nhập ngày giờ dạng DD/MM/YYYY HH:mm"
      className={className}
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
