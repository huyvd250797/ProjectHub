import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET() {
  const workbook = XLSX.utils.book_new();
  const guide = XLSX.utils.aoa_to_sheet([
    ["ASC WORKING V1.3.2 — IMPORT NHANH DANH MỤC PROJECT"],
    [""],
    ["1", "Giữ nguyên tên sheet: Phòng ban / PLHĐ / PLHĐ chi tiết."],
    ["2", "Không cần tạo import_key. Hệ thống tự đối chiếu dữ liệu hiện có và tái sử dụng key ổn định."],
    ["3", "Có thể chỉ import một nhóm dữ liệu. PLHĐ chi tiết nên đi cùng PLHĐ để mapping Module chính xác nhất."],
    ["4", "Luôn bấm Preview dữ liệu trước. Hệ thống sẽ báo số dòng Thêm / Cập nhật và cảnh báo mapping."],
    ["5", "Apply Import dùng chế độ Merge: cập nhật bản ghi khớp, thêm bản ghi mới và không xóa dữ liệu ngoài file."],
    ["6", "File tối đa 20 MB. Chỉ MASTER/Admin/PM được Apply."],
  ]);
  const departments = XLSX.utils.aoa_to_sheet([
    ["Tên phòng ban", "Mã phòng ban (tùy chọn)"],
  ]);
  const contract = XLSX.utils.aoa_to_sheet([
    ["Tên PLHĐ / Module", "Mã (tùy chọn)", "Loại (root / phân hệ / module - tùy chọn)", "Phòng ban (tùy chọn)", "Trạng thái (tùy chọn)", "Phân loại (tùy chọn)"],
  ]);
  const details = XLSX.utils.aoa_to_sheet([
    ["Mã", "Nội dung", "Module PLHĐ (tùy chọn)", "Ghi chú (tùy chọn)"],
  ]);

  guide["!cols"] = [{ wch: 8 }, { wch: 110 }];
  departments["!cols"] = [{ wch: 42 }, { wch: 24 }];
  contract["!cols"] = [{ wch: 58 }, { wch: 18 }, { wch: 28 }, { wch: 36 }, { wch: 24 }, { wch: 28 }];
  details["!cols"] = [{ wch: 16 }, { wch: 80 }, { wch: 52 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(workbook, guide, "HƯỚNG DẪN");
  XLSX.utils.book_append_sheet(workbook, departments, "Phòng ban");
  XLSX.utils.book_append_sheet(workbook, contract, "PLHĐ");
  XLSX.utils.book_append_sheet(workbook, details, "PLHĐ chi tiết");

  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(output, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ASC-WORKING-V1.3.2-Quick-Import-PLHD-PhongBan.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
