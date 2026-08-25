# ASC WORKING V1.0.1 — Dark Mode Contrast & Visual Polish

## Mục tiêu
Dark Mode vẫn giữ phong cách công nghệ/navy nhưng không để text phụ, metadata và control chìm vào nền.

## Dark palette
- App background: `#0b1422`
- Panel: `#14243a` / gradient tương đương
- Main text: `#f4f7fb`
- Secondary text: `#afbdcc` → `#90a4b8`
- Metadata: `#768da5` / `#7289a1`
- Accent cyan: `#39d8ff`
- Border nền: `rgba(158, 184, 210, .18-.20)`

## UAT nhanh
1. Dashboard: title, KPI, label phụ đều đọc rõ ở độ sáng màn hình 40–60%.
2. ISSUE: header, metadata YC, placeholder, inline combobox và dropdown không bị chìm.
3. PLHĐ: tree text cấp thấp vẫn phân biệt được với text chính.
4. Phòng ban / Remote Server / Master Console: border panel và input phân tầng rõ.
5. Hover/focus của button/select nhìn thấy nhưng không neon quá mạnh.
6. Chuyển Light Mode rồi quay lại Dark Mode không làm thay đổi dữ liệu hoặc layout.

Không có migration Supabase mới cho V1.0.1.
