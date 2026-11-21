---
title: Lớp và ký hiệu
description: Bản đồ nền phù hợp cho từng việc, nội dung ở mỗi mức thu phóng và ý nghĩa màu sắc, chữ cái trên ký hiệu.
eyebrow: Lớp và ký hiệu
lead: Bên dưới các đối tượng cứu hỏa là bản đồ nền do bạn chọn. Ký hiệu phía trên dùng màu sắc và chữ cái theo quy ước.
order: 3
---

## Bản đồ nền {#hintergrund}

:::figure layers frame=plain
Menu “Map layers” trên máy tính.
:::

| Bản đồ nền | Phù hợp cho |
|---|---|
| **Standard (Voyager)** | dùng hằng ngày: đường phố rõ, có số nhà từ mức 17 |
| **Print (Light)** | in và xuất: nền sáng giúp ký hiệu nổi bật |
| **Night (Dark)** | ban đêm và trong xe, giảm chói |
| **Satellite (Esri)** | định hướng tại hiện trường: nhà cửa, lối vào, cây cối |
| **Topographic (OSM)** | địa hình có đường đồng mức, lối đi và nguồn nước ngoài đô thị |
| **OSM (Intl)** | kiểu OpenStreetMap quen thuộc |
| **OSM (DE Style)** | OpenStreetMap theo kiểu Đức |
| **Bavaria Base** | bản đồ chính thức của cơ quan đo đạc Bavaria, chỉ ở Bavaria |
| **Bavaria Aerial** | ảnh hàng không chính thức, chỉ ở Bavaria |

Bản đồ nền đã chọn được giữ trong liên kết chia sẻ và dùng khi [xuất](../export/).

:::tip Tìm số nhà
Ở mức 17 và 18, Standard và OSM hiển thị số nhà, giúp đối chiếu trụ nước với địa chỉ.
:::

## Mức thu phóng {#zoom}

OpenFireMap chỉ tải nội dung phù hợp với chế độ xem hiện tại. Hộp trạng thái hiển thị mức thu phóng.

| Mức thu phóng | Nội dung |
|---|---|
| dưới 12 | chưa có đối tượng (trạng thái “Standby”) |
| 12–13 | trạm cứu hỏa dạng chấm |
| từ 14 | trạm dạng ký hiệu và ranh giới đô thị |
| 15–16 | trụ nước, điểm nước, máy khử rung tim dạng chấm màu |
| từ 16 | chạm trụ nước để hiện vòng tròn 100 mét |
| từ 17 | ký hiệu có chữ, có thể truy cập bằng bàn phím |
| 18 | chi tiết khi di chuột |

## Màu sắc và ký hiệu {#symbole}

Màu cho biết loại đối tượng, chữ cái trong ký hiệu cho biết dạng cụ thể:

- **Đỏ:** trụ nước. **U** là trụ ngầm, **O** là trụ nổi, **Ø** là trụ khô. Trụ gắn tường và loại khác có ký hiệu riêng.
- **Xanh dương:** điểm nước như ao chữa cháy, bể chứa, giếng nước chữa cháy hoặc điểm hút nước.
- **Xanh lá:** máy khử rung tim (AED).
- **Trạm cứu hỏa** có ký hiệu tòa nhà riêng.

Từ mức 17, các đối tượng nằm trong phạm vi 5 mét được nhóm lại và hiển thị số lượng.

Trang **[ký hiệu bản đồ](/symbols/)** liệt kê từng ký hiệu và thẻ OpenStreetMap. Trang này cũng hữu ích cho người lập bản đồ muốn biết ký hiệu được tạo ra như thế nào.

:::note Nguồn thông tin chi tiết
Loại, đường kính, số hiệu và thông tin khác lấy từ OpenStreetMap. Nếu chưa ghi loại trụ nước, bản đồ hiện chấm đỏ không có chữ. Xem cách bổ sung tại [Đóng góp](../contribute/).
:::
