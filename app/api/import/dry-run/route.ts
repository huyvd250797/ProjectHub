import { NextResponse } from "next/server";
import { inspectAscWorkingWorkbook } from "@/lib/import/workbook";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Không tìm thấy file Excel." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Import POC chỉ hỗ trợ file .xlsx." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File vượt quá giới hạn 10 MB của Import POC." }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await inspectAscWorkingWorkbook(arrayBuffer, file.name);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Import dry-run failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Không thể đọc workbook. Kiểm tra file .xlsx và thử lại." },
      { status: 500 },
    );
  }
}
