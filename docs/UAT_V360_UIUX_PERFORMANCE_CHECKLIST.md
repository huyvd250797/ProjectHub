# UAT V3.6.0 - UI/UX Performance Stabilization

## Version

- Mở footer/sidebar, kiểm tra hiển thị `V3.6.0`.
- Mở Settings/System, kiểm tra release là `UI/UX Performance Stabilization`.
- Mở `/api/health`, kiểm tra có feature:
  - `uiux-performance-stabilization`
  - `stale-while-revalidate-client-cache`
  - `workspace-performance-warmup`
  - `global-grid-reset-layout`

## Load và chuyển màn

- Vào Dashboard, ISSUE, Plan, Finance, Workload, Allocation.
- Kỳ vọng màn chuyển nhẹ, không giật mạnh.
- Khi quay lại màn vừa mở, dữ liệu xuất hiện nhanh hơn nhờ cache.
- Bấm refresh thủ công vẫn lấy dữ liệu mới.

## Skeleton và animation

- Hard refresh workspace.
- Kỳ vọng loading dùng skeleton ổn định, không nhảy layout quá mạnh.
- Bật cấu hình giảm motion trên hệ điều hành nếu có, animation không còn gây khó chịu.

## Grid lớn

- Mở ISSUE hoặc PLHĐ.
- Kéo đổi vị trí cột.
- Resize cột.
- Bấm **Reset layout cột**.
- Kỳ vọng thứ tự và độ rộng cột quay về mặc định.
- Nội dung dài vẫn xuống hàng, không bị cắt mất.

## Regression chính

- Mở/sửa ISSUE.
- Mở Plan và Auto Generate Plan.
- Mở Finance và sửa tháng.
- Mở Workload/Allocation.
- Mở Notification Center.
- Kỳ vọng không lỗi console nghiêm trọng, không mất dữ liệu, không lệch project.

