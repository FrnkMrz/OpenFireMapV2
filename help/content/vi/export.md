---
title: Xuất dữ liệu
description: Xuất sơ đồ trụ nước thành PNG hoặc PDF, xuất trụ nước thành GPX hoặc CSV; chọn khu vực, định dạng, mức chi tiết và giới hạn.
eyebrow: Xuất
lead: Chỉ vài thao tác để tạo sơ đồ trụ nước có thể in hoặc danh sách điểm dùng cho thiết bị dẫn đường và bảng tính.
order: 5
---

## Chọn định dạng nào? {#formate}

| Định dạng | Kết quả | Phù hợp với |
|---|---|---|
| **PNG** | ảnh khu vực có tiêu đề, thước tỷ lệ, ngày và ghi công | bảng thông báo, email, thuyết trình |
| **PDF** | cùng sơ đồ dưới dạng PDF | in và lưu trữ |
| **GPX** | trụ nước và đối tượng khác dưới dạng điểm tham chiếu | thiết bị dẫn đường, tác nghiệp, ứng dụng ngoài trời |
| **CSV** | bảng chi tiết cho từng đối tượng | bảng tính, phân tích, so sánh danh sách |

Chỉ có thể xuất trên máy tính. Nếu cần sơ đồ thiết kế với lưới, mục lục đường phố và tỷ lệ cố định, hãy dùng [bản đồ thành phố](../town-plan/).

## Từng bước {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
Menu xuất dữ liệu.
:::

:::steps
1. **Mở menu xuất:** nút mũi tên xuống ở góc trên bên trái, cạnh lớp bản đồ.
2. **Chọn tỷ lệ khung hình (1):** **Free** cho mọi khu vực, **A4 landscape** hoặc **A4 portrait** theo tỷ lệ giấy A4.
3. **Đặt khu vực:** **Select Area on Map (2)** cho phép kéo hình chữ nhật trên bản đồ. **Use visible area (3)** lấy màn hình hiện tại (theo tỷ lệ A4 nếu đã chọn). Nếu không chọn, bản đồ đang thấy sẽ được xuất.
4. **Chọn mức chi tiết (4):** mức 15 đến 18. Mức cao hơn có nhiều chi tiết và tệp lớn hơn. Dùng 18 cho một con phố, 16 cho cả thành phố.
5. **Chọn định dạng:** sơ đồ trụ nước là **PNG (5)** hoặc **PDF**, các điểm là **GPX (6)** hoặc **CSV**.
6. **Kiểm tra tiêu đề:** OpenFireMap gợi ý tên địa điểm. Sửa nếu cần rồi nhấn **Create**.
:::

:::figure title frame=plain
Có thể sửa tiêu đề được gợi ý trước khi tạo sơ đồ.
:::

Cửa sổ tiến trình cho biết công việc đang diễn ra. Nhấn **Cancel Process** để dừng xuất bất cứ lúc nào.

## Sơ đồ có gì {#plan}

PNG và PDF chứa khu vực đã chọn với [bản đồ nền](../layers/) hiện tại, tất cả đối tượng cứu hỏa, ranh giới đô thị, tiêu đề, thước tỷ lệ, ngày, mức chi tiết và dòng ghi công “© OpenStreetMap contributors”.

Tên tệp gồm ngày, giờ, mức chi tiết và tiêu đề, ví dụ `2026-11-19_14-30_Z18_Nuremberg.png`.

## GPX và CSV {#gpx-csv}

GPX chứa các đối tượng dưới dạng điểm tham chiếu cùng tọa độ và thông tin hiện có. CSV là bảng dữ liệu từng đối tượng để dùng trong bảng tính.

## Giới hạn khu vực {#grenzen}

Khu vực xuất tối đa 10 × 10 km. Nếu kéo khung lớn hơn, OpenFireMap sẽ giới hạn lại để tránh tệp quá lớn và thiếu bộ nhớ. Với khu vực thành phố rộng, hãy dùng [bản đồ thành phố](../town-plan/).

:::warn Kiểm tra trước khi dùng
Hãy bảo đảm dữ liệu đủ mới và chính xác cho mục đích sử dụng. OpenFireMap không phải nguồn tác nghiệp chính thức.
:::
