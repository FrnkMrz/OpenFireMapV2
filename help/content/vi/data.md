---
title: Dữ liệu và độ mới
description: Nguồn dữ liệu OpenFireMap, độ cập nhật, nội dung cửa sổ trạng thái dữ liệu và bộ nhớ đệm cục bộ.
eyebrow: Dữ liệu
lead: Mọi đối tượng cứu hỏa đều đến từ OpenStreetMap. OpenFireMap chuẩn bị dữ liệu để tải nhanh và lấy mục mới trực tiếp.
order: 4
---

## Dữ liệu đến từ đâu {#quelle}

Cộng đồng [OpenStreetMap](https://www.openstreetmap.org/) thêm trụ nước, điểm nước, trạm cứu hỏa và máy khử rung tim; nhiều người đóng góp là lính cứu hỏa địa phương. OpenFireMap hiển thị dữ liệu nhưng không sửa dữ liệu.

## OpenFireMap tải trụ nước thế nào {#ladeweg}

Tùy khu vực, bản đồ sử dụng một trong hai cách:

- **Ô bản đồ chuẩn bị sẵn:** tại Đức, Áo, Thụy Sĩ, Liechtenstein, Luxembourg và 40 quốc gia châu Âu khác, OpenFireMap tạo trước các ô dữ liệu từ bản trích xuất OpenStreetMap theo quốc gia (Geofabrik). Chúng được lưu trên Cloudflare và phân phối qua bộ nhớ đệm. Trình duyệt chỉ lấy một vài ô cần thiết cho màn hình.
- **Overpass API:** ở những nơi khác, OpenFireMap gửi truy vấn trực tiếp đến máy chủ Overpass công khai cho khu vực đang thấy và vùng đệm xung quanh.

:::note Vì sao Đức và châu Âu nhanh hơn
Không phải Overpass phản hồi nhanh hơn ở đó. Bản đồ lấy trụ nước từ các ô đã chuẩn bị; Overpass chỉ được hỏi về thay đổi kể từ ngày dữ liệu nền, nên truy vấn nhỏ hơn nhiều.
:::

### Overpass API là gì {#overpass}

[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) là dịch vụ công khai để truy vấn dữ liệu OpenStreetMap theo đối tượng và khu vực, chẳng hạn “mọi trụ nước trong hình chữ nhật này”. Tình nguyện viên và tổ chức vận hành máy chủ, nhiều ứng dụng cùng sử dụng.

Tốc độ phản hồi phụ thuộc vào:
- **tải** trên máy chủ OpenFireMap đang dùng;
- **diện tích** truy vấn và thời gian thực hiện;
- **thời gian chờ và từ chối** khi máy chủ quá tải hoặc giới hạn yêu cầu.

OpenFireMap biết bốn máy chủ Overpass và thử theo thứ tự ngẫu nhiên. Nếu máy chủ không phản hồi hoặc báo quá tải, bản đồ tạm hoãn máy chủ đó rồi thử máy chủ tiếp theo. Khu vực đã tải được giữ trong bộ nhớ đệm của trình duyệt.

## Độ cập nhật của dữ liệu {#aktualitaet}

| Khu vực | Dữ liệu nền | Mục mới và thay đổi |
|---|---|---|
| Đức, Áo, Thụy Sĩ, Liechtenstein, Luxembourg | ô chuẩn bị sẵn, thường dựng lại hằng ngày | truy vấn từ Overpass |
| 40 quốc gia châu Âu khác | ô chuẩn bị sẵn, thường dựng lại hằng tuần | truy vấn Overpass khi dữ liệu nền không quá 10 ngày |
| phần còn lại của thế giới | trạng thái máy chủ Overpass | mỗi lần truy vấn |

Sau khi tải các ô chuẩn bị sẵn, OpenFireMap truy vấn nền các thay đổi trong vùng xem kể từ ngày dữ liệu nền rồi bổ sung lên bản đồ.

### Vì sao mục mới chưa xuất hiện ngay {#verzoegerung}

Thay đổi trong OpenStreetMap không hiện ngay lập tức trên OpenFireMap:

- **Xử lý:** máy chủ Overpass phải nhận thay đổi. Nếu dữ liệu trả về quá cũ, OpenFireMap bỏ kết quả và hiển thị dữ liệu nền.
- **Bộ nhớ đệm:** kết quả truy vấn được lưu vài phút theo khu vực; khu vực đã tải cũng có thể nằm trong bộ nhớ đệm cục bộ.
- **Sự cố:** nếu Overpass quá tải hoặc không truy cập được, dữ liệu nền vẫn hiện cho đến khi truy vấn sau thành công. OpenFireMap không thể kiểm soát việc này.

Vì vậy không thể hứa thời gian cố định. Nếu chưa thấy mục mới, hãy tải lại bản đồ sau một lúc.

:::note Đối tượng đã xóa
Cập nhật chỉ phát hiện đối tượng mới và thay đổi. Trụ nước bị xóa khỏi OpenStreetMap chỉ biến mất sau lần cập nhật tiếp theo của các ô đã chuẩn bị.
:::

## Cửa sổ “Data status & origin” {#popover}

:::figure data frame=plain
Trạng thái và nguồn dữ liệu: dữ liệu nền từ hôm qua; lúc đó không thể truy cập cập nhật trực tiếp.
:::

Trên máy tính, mở bằng “Data status details” trong hộp trạng thái; trên điện thoại, chạm hộp trạng thái.

- **Nguồn:** ô chuẩn bị sẵn (DACHLiLu hoặc châu Âu), truy vấn trực tiếp hoặc bộ nhớ đệm cục bộ.
- **Trạng thái dữ liệu nền:** thời điểm trích xuất quốc gia được tạo. Nếu màn hình bao phủ nhiều quốc gia, ngày cũ nhất được dùng.
- **Cập nhật trực tiếp:** đã tải thay đổi mới hơn chưa. “Not available” nghĩa là dịch vụ trực tiếp không truy cập được và bản đồ đang hiển thị dữ liệu nền. Nút mũi tên thử lại.

Hộp trạng thái hiển thị dạng ngắn, ví dụ “As of: 1d ago +Sync”.

## Trang trạng thái {#statusseite}

[Trang trạng thái](/status/) hiển thị tuổi dữ liệu OpenStreetMap ở từng quốc gia, lần cập nhật bản đồ gần nhất và số lượng trụ nước, trạm cứu hỏa, máy khử rung tim trên đầu người. Trang hiện có tiếng Đức và tiếng Anh.

## Bộ nhớ đệm cục bộ {#cache}

Để mở nhanh khu vực đã xem, OpenFireMap lưu dữ liệu đã tải trong trình duyệt. Chọn thời gian tại **Local Cache** trong “Info & Legal” (trên điện thoại ở menu): tắt, 1 giờ, 1 ngày, 3 ngày, 7 ngày (mặc định) hoặc 30 ngày.

Dữ liệu ở lại trên thiết bị. Bộ nhớ đệm không thay thế cập nhật: khi mở khu vực đã lưu, dữ liệu vẫn được đối chiếu với dữ liệu mới.

## Không có internet {#offline}

OpenFireMap không phải bản đồ ngoại tuyến. Khu vực trong bộ nhớ đệm còn hiển thị một thời gian, nhưng khu vực mới và tìm kiếm cần mạng. Khi làm việc không có mạng, nên dùng [bản đồ thành phố](../town-plan/) hoặc [bản xuất](../export/) đã in.

## Khi tải chậm {#laden}

Ngoài các quốc gia có ô dữ liệu chuẩn bị sẵn, mọi thứ đều lấy qua Overpass. Nếu máy chủ bận, OpenFireMap tự động thử máy chủ kế tiếp; thông báo phía dưới cho biết tiến trình. Nếu chưa được, hãy phóng to một chút để truy vấn nhỏ hơn rồi thử lại sau. Nếu tất cả máy chủ đều quá tải, chỉ có thể tải lại sau.

:::warn Không phải nguồn tác nghiệp
Chất lượng dữ liệu phụ thuộc vào nội dung OpenStreetMap; dữ liệu có thể thiếu, cũ hoặc sai và không thay thế thông tin từ trung tâm điều phối hay đơn vị cấp nước. Khi khẩn cấp, luôn gọi số khẩn cấp tại địa phương (112 ở châu Âu).
:::
