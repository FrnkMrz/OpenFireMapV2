---
title: Câu hỏi thường gặp
description: Giải đáp câu hỏi phổ biến về bản đồ OpenFireMap, dữ liệu, xuất bản đồ, đóng góp, dự án và pháp lý.
eyebrow: FAQ
lead: Câu trả lời cho những câu hỏi thường gặp nhất. Không thấy câu hỏi của bạn? Viết cho chúng tôi tại info@openfiremap.org.
order: 10
---

## Bản đồ và điều khiển {#karte}

### Tại sao tôi không thấy trụ nước? {#keine-hydranten}

Trụ nước hiện từ mức thu phóng 15. Hãy phóng to thêm. Nếu vẫn không thấy, chưa ai thêm dữ liệu cho khu vực đó trong OpenStreetMap. Bạn có thể [tự bổ sung](../contribute/).

### Mở chi tiết trụ nước thế nào? {#details}

Trên máy tính, từ mức 18 di chuột lên ký hiệu. Trên điện thoại, chạm ký hiệu từ mức 17. Dùng bàn phím thì nhấn <kbd>Tab</kbd> để chọn từ mức 17 rồi nhấn <kbd>Enter</kbd>.

### Vòng tròn quanh trụ nước có nghĩa gì? {#kreis}

Vòng tròn có bán kính 100 mét và hiện từ mức 16 khi nhấp hoặc chạm trụ nước. Nó giúp nhận biết trụ nào nằm trong tầm vòi. Nếu đã dùng “Vị trí của tôi”, đường xanh còn cho biết khoảng cách từ bạn.

### Chữ cái trên ký hiệu có nghĩa gì? {#buchstaben}

Chúng cho biết loại: **U** trụ ngầm, **O** trụ nổi, **Ø** trụ khô. Xem mọi ký hiệu ở trang [ký hiệu bản đồ](/symbols/).

### Chia sẻ chế độ xem bản đồ thế nào? {#teilen}

Dùng nút chia sẻ (trên điện thoại, mục “Share Map View” trong menu). Liên kết lưu chế độ xem, mức thu phóng và bản đồ nền. Bạn cũng có thể lưu địa chỉ trên thanh trình duyệt.

### Có thể cài OpenFireMap như ứng dụng không? {#app}

Có. Trên iPhone dùng **Share → Add to Home Screen** trong Safari; Android dùng **⋮ → Install app** trong Chrome. Không cần cửa hàng ứng dụng. Xem [Bản đồ trên điện thoại](../phone/#app).

### Bản đồ có dùng ngoại tuyến được không? {#offline}

Một phần. Khu vực đã tải được lưu tạm tùy cài đặt bộ nhớ đệm. Khu vực mới và tìm kiếm cần mạng. Khi đi đường, [bản đồ thành phố](../town-plan/) đã in đáng tin cậy hơn.

## Dữ liệu và độ mới {#daten}

### Dữ liệu đến từ đâu? {#herkunft}

Từ [OpenStreetMap](https://www.openstreetmap.org/). Tình nguyện viên, thường có lính cứu hỏa địa phương, thêm trụ nước, điểm nước, trạm và máy khử rung tim. OpenFireMap hiển thị chứ không sửa dữ liệu.

### Vì sao bản đồ tải nhanh hơn ở Đức? {#schneller}

Ở Đức, Áo, Thụy Sĩ, Liechtenstein, Luxembourg và 40 quốc gia châu Âu khác, dữ liệu được chuẩn bị thành các ô trước. Nơi khác lấy trực tiếp từ Overpass API, phụ thuộc tải trên máy chủ công khai. Xem [Dữ liệu và độ mới](../data/#ladeweg).

### Khi nào trụ mới xuất hiện? {#neu}

Không thể xác định chính xác. Trụ hiện sau khi máy chủ Overpass xử lý thay đổi; bộ nhớ đệm có thể làm chậm một chút. Nếu Overpass quá tải hoặc không truy cập được, dữ liệu sẽ đến muộn. Đối tượng đã xóa biến mất sau lần cập nhật tiếp theo. Xem [Dữ liệu và độ mới](../data/#verzoegerung).

### Dữ liệu mới đến mức nào? {#aktuell}

Hộp trạng thái hiện ngày dữ liệu; “Data status & origin” có chi tiết. [Trang trạng thái](/status/) liệt kê tuổi dữ liệu ở từng quốc gia.

### Bản đồ không tải hoặc báo quá tải. Tôi nên làm gì? {#laedt-nicht}

Phóng to một chút để giảm truy vấn rồi thử lại sau. Nếu tất cả máy chủ đều quá tải, vấn đề nằm ở máy chủ Overpass công khai. Hãy tải lại sau.

### Dữ liệu có đáng tin cho hoạt động cứu hỏa không? {#verbindlich}

Không. OpenFireMap không phải công cụ tác nghiệp. Dữ liệu có thể thiếu, cũ hoặc sai và không thay thế thông tin của trung tâm điều phối, chính quyền hoặc đơn vị cấp nước. Trường hợp khẩn cấp hãy gọi số khẩn cấp trước (112 tại châu Âu).

## Xuất và bản đồ thành phố {#export}

### Vì sao không có xuất dữ liệu trên điện thoại? {#export-handy}

Sơ đồ sẵn sàng in cần nhiều bộ nhớ và màn hình lớn để chọn khu vực. Vì vậy chỉ máy tính mới có xuất và bản đồ thành phố.

### Có thể xuất khu vực lớn đến đâu? {#export-groesse}

Tối đa 10 × 10 km. Nếu kéo khung lớn hơn, OpenFireMap giới hạn lại. Với thành phố lớn cần lưới và mục lục đường phố, dùng [bản đồ thành phố](../town-plan/).

### Xuất khác bản đồ thành phố như thế nào? {#unterschied}

[Xuất](../export/) nhanh chóng tạo ảnh, PDF hoặc danh sách điểm (GPX, CSV). [Bản đồ thành phố](../town-plan/) là trang thiết kế khổ A4 đến A1 với tỷ lệ cố định, lưới, chú giải và mục lục đường phố; hiện dành cho địa điểm ở Đức.

### Bản in sai tỷ lệ. {#massstab}

In PDF ở **Actual size** hoặc **100%**, không chọn “Fit to page”, và dùng khổ giấy đã chọn trong trình hướng dẫn. Sau đó kiểm tra tỷ lệ bằng thước.

### Tôi có thể in và chia sẻ sơ đồ cho đội cứu hỏa không? {#drucken}

Có. Dữ liệu dùng Open Database License. Mỗi sơ đồ phải giữ dòng “© OpenStreetMap contributors”. Xuất và bản đồ thành phố tự in ghi công; đừng cắt bỏ.

## Đóng góp {#mitmachen}

### Trụ nước bị thiếu hoặc sai. Ai sửa được? {#korrigieren}

Bạn có thể sửa trong OpenStreetMap với tài khoản miễn phí. Hướng dẫn Hydrantenjäger, StreetComplete, iD và JOSM ở [Thêm trụ nước](../contribute/).

### Đội cứu hỏa muốn kiểm tra trụ nước trong khu vực thì làm sao? {#feuerwehr}

Có thể tổ chức buổi huấn luyện hoặc chia nhóm khảo sát thành phố. Hướng dẫn cho đội cứu hỏa ở Đức chỉ có tiếng Đức: [Für Feuerwehren](/help/fire-brigades/). Nơi khác xem công cụ trong [Thêm trụ nước](../contribute/).

### Có được sao chép sơ đồ của chính quyền hoặc đơn vị cấp nước không? {#plaene}

Chỉ khi được cho phép rõ ràng. Sơ đồ được bảo vệ bản quyền. Tốt nhất chỉ thêm những gì đã thấy tận mắt tại hiện trường.

### Có thể dùng lớp cứu hỏa trên bản đồ riêng không? {#overlay}

Có, bằng lớp phủ. Thông tin ở [trang lớp phủ](/overlay/).

## Dự án và pháp lý {#projekt}

### Đây có phải bản đồ cứu hỏa chính thức? {#offiziell}

Không. OpenFireMap là dự án cá nhân phi thương mại dựa trên OpenStreetMap, không chính thức hợp tác với cơ quan hay đội cứu hỏa nào.

### OpenFireMap có mất phí không? {#kosten}

Không. Không cần tài khoản, không quảng cáo, không thuê bao. Mã nguồn theo giấy phép MIT trên [GitHub](https://github.com/FrnkMrz/OpenFireMapV2).

### OpenFireMap lưu dữ liệu nào về tôi? {#datenschutz}

Bản đồ chạy trong trình duyệt. Chỉ lưu các cài đặt như ngôn ngữ và bộ nhớ đệm, chế độ xem gần nhất, cài đặt bản đồ thành phố và dữ liệu bản đồ đã tải. Trình duyệt liên hệ dịch vụ ngoài để tìm kiếm, tải ô bản đồ và dữ liệu. Xem [chính sách quyền riêng tư](/?legal=1).

### Liên hệ với bạn bằng cách nào? {#kontakt}

Gửi email đến [info@openfiremap.org](mailto:info@openfiremap.org), hoặc báo lỗi và đề xuất qua [issue trên GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).
