---
title: Khả năng tiếp cận
description: Dùng OpenFireMap bằng bàn phím, trình đọc màn hình, phóng to và giảm chuyển động; những gì hoạt động và điều chưa được kiểm thử.
eyebrow: Khả năng tiếp cận
lead: OpenFireMap hướng đến mọi người, kể cả khi không dùng chuột, dùng trình đọc màn hình hoặc phóng to nhiều. Đây là hướng dẫn và những phần còn thiếu.
order: 9
---

## Mục tiêu của chúng tôi {#ziel}

Bản đồ tuân theo hướng dẫn **WCAG 2.2 cấp AA**. Mỗi thay đổi đều được kiểm tra tự động về thao tác bàn phím, nhãn trình đọc màn hình, độ tương phản, hiển thị ở mức phóng to 400% và kích thước tối thiểu của nút. Trang trợ giúp và trang ký hiệu bản đồ cũng được kiểm tra.

:::note Tình trạng thực tế
Kiểm tra tự động không phát hiện được mọi thứ. Chúng tôi vẫn cần thử với trình đọc màn hình thật trên thiết bị. Nếu gặp vấn đề, hãy báo cho chúng tôi; mọi góp ý đều hữu ích.
:::

## Dùng bàn phím {#tastatur}

Mọi thao tác bằng chuột đều có thể thực hiện bằng bàn phím:

| Phím | Tác dụng |
|---|---|
| <kbd>Tab</kbd> | chuyển đến điều khiển kế tiếp. Điểm dừng đầu là “Skip to map”. |
| Phím mũi tên | dịch chuyển bản đồ khi bản đồ có tiêu điểm |
| <kbd>+</kbd> và <kbd>−</kbd> | phóng to, thu nhỏ |
| <kbd>Tab</kbd> từ mức 17 | chuyển lần lượt qua các ký hiệu |
| <kbd>Enter</kbd> hoặc <kbd>Space</kbd> trên ký hiệu | mở chi tiết; với trụ nước cũng hiện vòng tròn 100 mét |
| <kbd>Escape</kbd> | đóng chi tiết, vòng tròn, menu và hộp thoại; hủy chọn vùng xuất |

Tiêu điểm luôn hiển thị rõ. Khi mở menu hoặc hộp thoại, tiêu điểm chuyển vào trong và ở đó đến khi đóng; sau đó trở lại nút đã mở.

**Xuất không cần chuột:** chọn **Use visible area** trong menu xuất để lấy màn hình hiện tại, không cần kéo khung. Xem [Xuất dữ liệu](../export/).

**Tạo bản đồ thành phố không cần chuột:** ở bước 3, dùng <kbd>Tab</kbd> chọn tiêu đề, chú giải và các hộp khác, rồi dùng phím mũi tên để di chuyển; giữ <kbd>Shift</kbd> để đi xa hơn. <kbd>Alt</kbd> + phím mũi tên đổi kích thước bản đồ. Xem [Bản đồ thành phố](../town-plan/#schritt-3).

## Dùng trình đọc màn hình {#screenreader}

- **Bản đồ:** được đánh dấu là vùng có tên và hướng dẫn dùng bàn phím.
- **Ký hiệu:** từ mức 17, mỗi ký hiệu có tên, ví dụ “Trụ nước” kèm loại và số hiệu. Nhấn <kbd>Enter</kbd> để mở thông tin được đọc thành tiếng.
- **Thông báo:** các thông báo như “Đã sao chép liên kết” và lỗi tải sẽ được đọc; lỗi được ưu tiên. Hộp trạng thái cố ý không đọc mỗi lần bạn di chuyển bản đồ.
- **Ngôn ngữ:** nhãn cho trình đọc màn hình có trong mọi ngôn ngữ của bản đồ. Trang trợ giúp này có tiếng Đức và tiếng Anh.

:::tip Nhiều ký hiệu cùng lúc
Dưới mức thu phóng 17, các chấm không thể chọn riêng lẻ vì sẽ tạo ra hàng trăm điểm dừng Tab. Nhấn <kbd>+</kbd> để phóng to đến khi ký hiệu xuất hiện.
:::

## Thị lực và phóng to {#sehen}

- **Độ tương phản:** chữ trên bảng đạt tỷ lệ ít nhất 4,5:1; chữ lớn và ký hiệu đạt 3:1. Vì bảng bán trong suốt nằm trên bản đồ, độ tương phản được kiểm tra trên cả nền sáng lẫn tối.
- **Phóng đại:** phóng trang trong trình duyệt đến 400%. Trang sẽ chuyển sang giao diện hẹp có menu; mọi menu vẫn có thể truy cập và cuộn.
- **Không chỉ dựa vào màu:** trụ nước vừa khác màu vừa có chữ trong ký hiệu (U, O, Ø…).
- **Bản đồ nền:** nếu khó nhìn hoặc bị chói, chọn **Print (Light)** hoặc **Night (Dark)**. Xem [Lớp và ký hiệu](../layers/).

## Chuyển động {#bewegung}

Nếu bật **Reduce motion** trong hệ điều hành, OpenFireMap bỏ hiệu ứng chuyển động: tìm kiếm và định vị chuyển thẳng đến nơi. Trang trợ giúp cũng không dùng chuyển động.

## Trên điện thoại thông minh {#smartphone}

Nút điều khiển có kích thước tối thiểu 24 × 24 pixel. Chạm ký hiệu từ mức 17 để mở chi tiết. Dùng VoiceOver hoặc TalkBack để đến các nút trong menu góc trên bên trái. Xem [Bản đồ trên điện thoại](../phone/).

## Chưa được kiểm thử {#offen}

- kiểm thử đầy đủ với trình đọc màn hình trên thiết bị (VoiceOver, TalkBack, NVDA);
- độ tương phản của ký hiệu trên tất cả bản đồ nền, đặc biệt là vệ tinh;
- dùng trình hướng dẫn bản đồ thành phố bằng trình đọc màn hình.

## Gặp rào cản? {#melden}

Hãy cho chúng tôi biết điều gì không hoạt động, kèm thiết bị, trình duyệt và trình đọc màn hình (nếu có): **[info@openfiremap.org](mailto:info@openfiremap.org)**. Nếu am hiểu kỹ thuật, bạn cũng có thể tạo [issue trên GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).
