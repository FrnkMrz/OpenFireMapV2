---
title: Thêm trụ nước
description: Cách thêm trụ nước cứu hỏa, điểm nước và máy khử rung tim vào OpenStreetMap bằng Hydrantenjäger, StreetComplete, Every Door, trình biên tập iD hoặc JOSM.
eyebrow: Đóng góp
lead: Mỗi trụ nước trên bản đồ đều do ai đó thêm vào. Nếu thiếu một trụ, bạn có thể tự thêm bằng tài khoản OpenStreetMap miễn phí.
order: 7
---

## Trước khi bắt đầu {#vorher}

OpenFireMap hiển thị dữ liệu từ [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Bạn chỉnh sửa trên OpenStreetMap, không phải OpenFireMap. Cần có tài khoản:

:::steps
1. Vào [openstreetmap.org](https://www.openstreetmap.org/user/new), chọn **Sign Up**.
2. Chọn tên người dùng, email, mật khẩu và xác nhận email.
3. Dùng tài khoản này đăng nhập các công cụ bên dưới.
:::

:::warn Ba quy tắc
- **Chỉ thêm những gì bạn trực tiếp thấy tại hiện trường.** Kiểm tra vị trí và loại trụ.
- **Không sao chép dữ liệu từ sơ đồ của người khác.** Sơ đồ của đơn vị cấp nước hoặc chính quyền được bảo vệ bản quyền; chỉ sử dụng khi có sự cho phép rõ ràng.
- **Khi lưu, mô tả ngắn gọn điều đã thay đổi**, ví dụ “Thêm trụ nước trên đường Main”.
:::

Các đội cứu hỏa tại Đức có hướng dẫn kiểm tra trụ nước trong khu vực khi diễn tập hoặc đi khảo sát thành phố, hiện chỉ bằng tiếng Đức: [Für Feuerwehren](/help/fire-brigades/).

## Chọn công cụ phù hợp {#werkzeug}

| Tình huống | Công cụ | Lý do |
|---|---|---|
| đang ở hiện trường với điện thoại và muốn thêm nhanh | **Hydrantenjäger** | thiết kế cho trụ nước, đặt điểm bằng la bàn, ít trường |
| đi đường và muốn bổ sung dữ liệu | **StreetComplete** hoặc **Every Door** | trả lời câu hỏi về đối tượng gần đó |
| dùng máy tính để chỉnh sửa vị trí cụ thể | **trình biên tập iD** | chạy trong trình duyệt tại openstreetmap.org, không cần cài đặt |
| có kinh nghiệm, chỉnh sửa nhiều trụ | **JOSM** (máy tính) hoặc **Vespucci** (Android) | kiểm soát đầy đủ mọi thẻ |

## Dùng Hydrantenjäger {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/) là ứng dụng web cho điện thoại, được tạo riêng cho nhiệm vụ này:

:::steps
1. Đăng nhập bằng tài khoản OpenStreetMap.
2. Đứng cách trụ khoảng ba mét và hướng điện thoại về phía đó. Ứng dụng đặt điểm bằng GPS và la bàn.
3. Chọn loại và vị trí; chỉ nhập đường kính và số hiệu nếu chắc chắn.
4. Tải lên. Hoàn tất.
:::

Hướng dẫn chi tiết về các loại trụ có tại [trang trợ giúp Hydrantenjäger](https://hydrantenjaeger.de/help/).

## Dùng StreetComplete hoặc Every Door {#apps}

- **[StreetComplete](https://streetcomplete.app/)** (Android, iOS) đặt câu hỏi về đối tượng gần bạn, chẳng hạn “Đây là loại trụ nước nào?”. Chạm để trả lời. Ứng dụng chủ yếu giúp điền chi tiết còn thiếu cho đối tượng có sẵn.
- **[Every Door](https://every-door.app/)** (Android, iOS) dùng để thêm điểm. Nhấn nút cộng để đặt điểm mới, chọn “Fire Hydrant” và điền các trường.

## Dùng trình biên tập iD trong trình duyệt {#id}

iD là trình biên tập tiêu chuẩn trên openstreetmap.org.

:::steps
1. Mở [openstreetmap.org](https://www.openstreetmap.org/), đăng nhập và phóng to vị trí trụ nước.
2. Nhấn **Edit** ở trên. Lần đầu, hãy xem phần giới thiệu ngắn.
3. Nhấn **Point** và đặt điểm chính xác tại trụ. Ảnh hàng không giúp định hướng.
4. Nhập “hydrant” vào ô tìm kiếm bên trái rồi chọn mẫu **Fire Hydrant**.
5. Điền **Type** (ngầm, nổi, gắn tường, ống), **Position** (ví dụ vỉa hè hoặc làn đường), **Diameter** và **Reference** nếu biết.
6. Nhấn **Save** ở góc trên bên phải, ghi chú ngắn rồi nhấn **Upload**.
:::

:::tip Sửa trụ nước đã có
Nhấp vào trụ hiện có, sửa các trường bên trái rồi lưu. Nếu đặt sai vị trí, kéo điểm đến nơi đúng. Chỉ xóa khi đã kiểm tra tại chỗ và chắc chắn trụ không còn tồn tại.
:::

## Dùng JOSM hoặc Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) là trình biên tập máy tính viết bằng Java; [Vespucci](https://vespucci.io/) là phiên bản tương tự cho Android. Cả hai hiển thị trực tiếp mọi thẻ và phù hợp với việc lớn, ví dụ cập nhật toàn bộ trụ nước sau chuyến khảo sát. Các thẻ chính được liệt kê dưới đây.

## Các thẻ quan trọng {#tags}

OpenStreetMap mô tả đối tượng bằng thẻ dạng `key=value`. Mẫu trong ứng dụng tự đặt thẻ. Nếu nhập trực tiếp, hãy dùng:

| Đối tượng | Thẻ | Ý nghĩa |
|---|---|---|
| Trụ nước | `emergency=fire_hydrant` | bắt buộc cho mọi trụ |
| | `fire_hydrant:type=underground` | trụ ngầm (cũng có `pillar`, `wall`, `pipe`) |
| | `fire_hydrant:diameter=80` | đường kính danh định DN như trên biển |
| | `fire_hydrant:position=sidewalk` | vị trí (cũng có `lane`, `parking_lot`, `green`) |
| | `ref=123` | số hiệu trụ nếu có |
| | `fire_hydrant:pressure=4` | áp suất bar nếu biết |
| Điểm hút nước | `emergency=suction_point` | nơi lấy nước từ nguồn nước |
| Bể nước | `emergency=water_tank` | bể hoặc két nước chữa cháy |
| Ao chữa cháy | `emergency=fire_water_pond` | ao làm nguồn nước chữa cháy |
| Máy khử rung tim | `emergency=defibrillator` | thêm `indoor=yes/no`, `defibrillator:location=…`, `opening_hours=…` |
| Trạm cứu hỏa | `amenity=fire_station` | tòa nhà hoặc khu vực của đội cứu hỏa |

Trang [ký hiệu bản đồ](/symbols/) cho biết các thẻ hiển thị ra sao. [Wiki OpenStreetMap](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant) mô tả chi tiết.

## Khi nào thay đổi xuất hiện? {#anzeige}

Sau khi tải lên, trụ nước được lưu ngay trong OpenStreetMap. Nó xuất hiện trên OpenFireMap sau khi các dịch vụ cung cấp dữ liệu xử lý thay đổi. Thường là nhanh nhưng không có thời gian cố định. [Dữ liệu và độ mới](../data/#verzoegerung) giải thích các nguyên nhân có thể gây chậm.
