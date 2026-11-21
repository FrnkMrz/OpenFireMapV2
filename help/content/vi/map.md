---
title: Bản đồ trên máy tính
description: Tìm kiếm, vị trí, lớp bản đồ, chi tiết trụ nước, chia sẻ, hộp trạng thái và cách dùng bàn phím trên máy tính.
eyebrow: Bản đồ
lead: Các công cụ nằm ở góc trên bên trái, ngày dữ liệu ở góc dưới bên phải. Trang này giải thích từng nút và thông tin trên bản đồ.
order: 1
---

## Tổng quan {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap trên máy tính: khu phố cổ Nuremberg ở mức thu phóng 17.
:::

1. **Tìm kiếm:** tìm địa điểm hoặc địa chỉ.
2. **Vị trí của tôi:** chuyển đến nơi bạn đang ở.
3. **Lớp bản đồ:** đổi bản đồ nền.
4. **Xuất:** sơ đồ trụ nước dạng PNG hoặc PDF, điểm dạng GPX hoặc CSV.
5. **Chia sẻ:** sao chép liên kết đến chế độ xem hiện tại.
6. **Trụ nước:** di chuột để xem chi tiết, nhấp để hiện vòng tròn bán kính 100 mét.
7. **Hộp trạng thái:** mức thu phóng và ngày dữ liệu.
8. **Thông tin và pháp lý:** trợ giúp, ký hiệu, thông tin pháp lý, quyền riêng tư, cài đặt.

## Tìm địa điểm {#suche}

Nhập địa điểm, đường phố hoặc địa chỉ vào ô tìm kiếm ở góc trên bên trái rồi nhấn <kbd>Enter</kbd> hoặc biểu tượng kính lúp. Bản đồ chuyển đến kết quả đầu tiên và phóng to mức 16 để trụ nước hiện ra ngay.

Tìm kiếm dùng Nominatim, dịch vụ tìm kiếm của OpenStreetMap. Dịch vụ tìm địa điểm và địa chỉ, không tìm từng trụ nước riêng lẻ.

## Vị trí của tôi {#standort}

Nút vị trí cho biết bạn đang ở đâu và phóng bản đồ đến mức 17. Lần đầu, trình duyệt sẽ hỏi có cho OpenFireMap dùng vị trí của bạn không. Vị trí chỉ được dùng trong trình duyệt và không lưu lại.

:::tip Không có vị trí?
Kiểm tra trình duyệt đã cho phép openfiremap.org truy cập vị trí chưa. Máy tính không có GPS thường chỉ xác định được vị trí trong phạm vi sai số vài trăm mét.
:::

## Trụ nước và đối tượng khác {#objekte}

Thông tin hiển thị tùy thuộc mức thu phóng:

| Mức thu phóng | Nội dung |
|---|---|
| dưới 12 | chưa có đối tượng |
| từ 12 | trạm cứu hỏa |
| từ 14 | trạm dạng ký hiệu và ranh giới đô thị |
| từ 15 | trụ nước, điểm nước và máy khử rung tim dạng chấm màu |
| từ 17 | mọi đối tượng dạng ký hiệu có chữ |
| từ 18 | chi tiết khi di chuột |

:::figure marker frame=plain
Nhấp vào trụ nước để vẽ vòng tròn bán kính 100 mét.
:::

**Xem chi tiết:** từ mức 18, di chuột lên ký hiệu để mở thông tin. Dùng bàn phím thì từ mức 17 nhấn <kbd>Tab</kbd> để chọn ký hiệu rồi nhấn <kbd>Enter</kbd>.

**Bán kính và khoảng cách:** từ mức 16, nhấp vào trụ nước để hiện vòng tròn nét đứt bán kính 100 mét, giúp ước lượng trụ nào nằm trong tầm vòi. Từ mức 17 vòng tròn có nhãn “100 m”. Nếu trước đó bạn đã dùng **Vị trí của tôi**, từ mức 17 bản đồ còn vẽ đường màu xanh và khoảng cách đến trụ nước.

Chi tiết cho biết dữ liệu được ghi trong OpenStreetMap, chẳng hạn loại, đường kính, số hiệu, áp suất, vị trí hoặc đơn vị quản lý. Nếu thiếu thông tin thì chưa có ai thêm vào. [Đóng góp](../contribute/) hướng dẫn cách bổ sung.

Trang [Lớp và ký hiệu](../layers/) giải thích màu sắc và ký hiệu.

## Lớp bản đồ {#ebenen}

Nút hình bản đồ mở lựa chọn bản đồ nền: tiêu chuẩn, in ấn, ban đêm, vệ tinh, địa hình, hai kiểu OSM, cùng BayernAtlas và ảnh hàng không cho Bavaria. Các đối tượng cứu hỏa luôn nằm trên nền. Xem bản đồ nền phù hợp tại [Lớp và ký hiệu](../layers/).

## Chia sẻ và liên kết {#teilen}

Nút chia sẻ sao chép liên kết đến đúng chế độ xem này vào bộ nhớ tạm. Người mở liên kết sẽ thấy cùng địa điểm, mức thu phóng và bản đồ nền.

Địa chỉ trên thanh trình duyệt thay đổi khi bạn di chuyển bản đồ. Dạng liên kết là `#zoom/latitude/longitude/background`, ví dụ `openfiremap.org/#17/49.45280/11.07700/voyager`. Bạn cũng có thể lưu địa chỉ vào dấu trang.

## Hộp trạng thái và ngày dữ liệu {#status}

Góc dưới bên phải hiển thị mức thu phóng hiện tại và ngày dữ liệu, ví dụ “As of: 1d ago”. “+Sync” nghĩa là các thay đổi mới hơn từ OpenStreetMap đã được tải. Nhấp “Data status details” để xem nguồn, ngày dữ liệu nền và tình trạng cập nhật trực tiếp. Xem [Dữ liệu và độ mới](../data/).

## Thông tin, pháp lý và cài đặt {#info}

“Info & Legal” ở góc dưới bên trái mở hộp thoại có liên kết đến trợ giúp, ký hiệu bản đồ, lớp phủ, thông tin pháp lý, quyền riêng tư và giấy phép. Tại đây bạn cũng đặt **bộ nhớ đệm cục bộ**: tắt, 1 giờ, 1 ngày, 3 ngày, 7 ngày (mặc định) hoặc 30 ngày. Khu vực đã tải sẽ hiện nhanh hơn.

## Dùng bàn phím {#tastatur}

Có thể dùng OpenFireMap hoàn toàn không cần chuột:

- Lần nhấn <kbd>Tab</kbd> đầu tiên đến “Skip to map”.
- Trên bản đồ, dùng phím mũi tên để dịch chuyển, <kbd>+</kbd> và <kbd>−</kbd> để thu phóng.
- Từ mức 17, dùng <kbd>Tab</kbd> để đến các ký hiệu. Nhấn <kbd>Enter</kbd> hoặc <kbd>Space</kbd> để mở chi tiết, <kbd>Escape</kbd> để đóng.
- Trong menu và hộp thoại, tiêu điểm ở bên trong; nhấn <kbd>Escape</kbd> để đóng.
- Khi xuất, chọn “Use visible area” để dùng vùng đang thấy mà không cần kéo khung.
