# KanjiGO assets

Asset được chia theo chức năng để dễ mở rộng:

```text
assets/
├── characters/
│   ├── player.png
│   └── npc.png
├── world/
│   ├── tileset.png
│   └── academy.png
└── monsters/
    └── <monId>/
        └── sprite.png
```

## Characters

`player.png` và `npc.png` là spritesheet RGBA `128×128 px`, gồm `4×4` frame `32×32 px`. Thứ tự hàng phải khớp `DIR_ROW`: `down`, `left`, `right`, `up`; mỗi hàng chứa 4 frame đi bộ. Hai nhân vật dùng thiết kế nhân viên FPT áo cam, quần xanh navy và thẻ đeo; NPC được phân biệt bằng tóc/dáng đứng. Engine hiện dùng frame `down:0` cho NPC tĩnh nhưng giữ đủ sheet để có thể animate sau này.

## World

`world/tileset.png` là strip ngang `224×32 px`, gồm 7 tile `32×32 px` theo thứ tự:

```text
0 cỏ | 1 cây | 2 nước | 3 đường | 4 hoa | 5 bụi cỏ | 6 thuyền
```

Các ô học viện `7–9` trong map được phủ nền cỏ và vẽ bằng `world/academy.png`, nên không cần nằm trong tileset. `academy.png` là sprite RGBA `160×128 px` (footprint `5×4` tile); cửa chính nằm giữa ô dưới cùng để khớp `ACADEMY_DOOR` tại `(5, 4)`.

## Monsters

Mỗi monster có thư mục riêng theo đúng `monId` trong `CONFIG.MONSTERS`. Sprite hiện dùng tên `sprite.png`; sau này có thể đặt thêm `baby.png`, `adult.png`, `prime.png`, portrait hoặc effect trong cùng thư mục mà không làm rối asset của monster khác.

```text
monsters/yin/sprite.png  256×256 → Âm Thư Yêu 音
monsters/ri/sprite.png   256×256 → Nhật Quang 日
monsters/kuni/sprite.png 256×256 → Quốc Vương 国
monsters/nen/sprite.png  256×256 → Niên Thú 年
monsters/dai/sprite.png  256×256 → Đại Vương 大
monsters/fish/sprite.png 256×256 → Ngư Âm Tinh 魚
monsters/bar/sprite.png  256×151 → Nhất Bản 一
monsters/hito/sprite.png 256×256 → Nhân Bộ Khách 人
monsters/juu/sprite.png  256×256 → Thập Lực Sĩ 十
monsters/ni/sprite.png   256×256 → Nhị Tuyến Tinh 二
monsters/hon/sprite.png  256×256 → Bản Nguyên Linh 本
monsters/chuu/sprite.png 256×256 → Trung Tâm Vệ 中
monsters/chou/sprite.png 256×256 → Trường Lão 長
monsters/shutsu/sprite.png 256×256 → Xuất Môn Tinh 出
monsters/san/sprite.png    256×256 → Tam Tầng Võ Sĩ 三
monsters/ji/sprite.png     256×256 → Thời Khắc Linh 時
monsters/gyou/sprite.png   256×256 → Hành Lộ Tinh 行
monsters/ken/sprite.png    256×256 → Kiến Nhãn Linh 見
monsters/ima/sprite.png    256×256 → Hiện Thời Tinh 今
monsters/getsu/sprite.png  256×256 → Nguyệt Quang Linh 月
monsters/bun/sprite.png    256×256 → Phân Đoạn Nhân 分
monsters/ato/sprite.png    256×256 → Hậu Hành Giả 後
monsters/mae/sprite.png    256×256 → Tiền Phong Linh 前
monsters/sei/sprite.png    256×256 → Sinh Mệnh Tinh 生
monsters/go/sprite.png     256×256 → Ngũ Lực Sĩ 五
monsters/kan/sprite.png    256×256 → Khoảng Giới Linh 間
monsters/ue/sprite.png     256×256 → Thượng Thăng Linh 上
monsters/higashi/sprite.png 256×256 → Đông Dương Tinh 東
monsters/yon/sprite.png    256×256 → Tứ Phương Linh 四
monsters/kin/sprite.png    256×256 → Kim Quang Tinh 金
monsters/kyuu/sprite.png   256×256 → Cửu Hoàn Linh 九
monsters/nyuu/sprite.png   256×256 → Nhập Môn Linh 入
monsters/gaku/sprite.png   256×256 → Học Trí Tinh 学
monsters/kou/sprite.png    256×256 → Cao Phong Linh 高
monsters/en/sprite.png     256×256 → Viên Hoàn Tinh 円
monsters/ko/sprite.png     256×256 → Đồng Tử Linh 子
monsters/gai/sprite.png    256×256 → Ngoại Giới Linh 外
monsters/hachi/sprite.png  256×256 → Bát Phương Tinh 八
monsters/roku/sprite.png   256×256 → Lục Giác Linh 六
monsters/shita/sprite.png  256×256 → Hạ Giáng Linh 下
monsters/rai/sprite.png    256×256 → Lai Phong Linh 来
monsters/ki/sprite.png     256×256 → Khí Lưu Tinh 気
monsters/shou/sprite.png   256×256 → Tiểu Quang Linh 小
monsters/nana/sprite.png   256×256 → Thất Tinh Linh 七
monsters/yama/sprite.png   256×256 → Sơn Mạch Linh 山
monsters/hanashi/sprite.png 256×256 → Thoại Âm Linh 話
monsters/onna/sprite.png    256×256 → Nữ Hoa Linh 女
monsters/kita/sprite.png    256×256 → Bắc Cực Linh 北
monsters/gozen/sprite.png   256×256 → Ngọ Quang Linh 午
monsters/hyaku/sprite.png   256×256 → Bách Điểm Linh 百
monsters/sho/sprite.png     256×256 → Thư Bút Linh 書
monsters/saki/sprite.png    256×256 → Tiên Phong Linh 先
monsters/na/sprite.png      256×256 → Danh Ấn Linh 名
monsters/kawa/sprite.png    256×256 → Xuyên Lưu Linh 川
monsters/sen/sprite.png     256×256 → Thiên Tinh Linh 千
monsters/mizu/sprite.png    256×256 → Thủy Ba Linh 水
monsters/han/sprite.png     256×256 → Bán Phân Linh 半
monsters/otoko/sprite.png   256×256 → Nam Lực Linh 男
monsters/nishi/sprite.png   256×256 → Tây Dương Linh 西
monsters/den/sprite.png     256×256 → Điện Quang Linh 電
monsters/go_lang/sprite.png 256×256 → Ngữ Âm Linh 語
monsters/tsuchi/sprite.png  256×256 → Thổ Địa Linh 土
monsters/moku/sprite.png    256×256 → Mộc Diệp Linh 木
monsters/shoku/sprite.png   256×256 → Thực Vị Linh 食
monsters/kuruma/sprite.png  256×256 → Xa Luân Linh 車
monsters/minami/sprite.png  256×256 → Nam Phong Linh 南
monsters/nani/sprite.png    256×256 → Hà Vấn Linh 何
monsters/man/sprite.png     256×256 → Vạn Tinh Linh 万
monsters/kou_school/sprite.png 256×256 → Hiệu Học Linh 校
monsters/mai/sprite.png     256×256 → Mỗi Nhật Linh 毎
monsters/shiro/sprite.png   256×256 → Bạch Quang Linh 白
monsters/ten/sprite.png     256×256 → Thiên Không Linh 天
monsters/haha/sprite.png    256×256 → Mẫu Tâm Linh 母
monsters/hi_fire/sprite.png 256×256 → Hỏa Diệm Linh 火
monsters/migi/sprite.png    256×256 → Hữu Hướng Linh 右
monsters/yomu/sprite.png    256×256 → Độc Thư Linh 読
monsters/tomo/sprite.png    256×256 → Hữu Nghị Linh 友
monsters/hidari/sprite.png  256×256 → Tả Hướng Linh 左
monsters/yasumi/sprite.png  256×256 → Hưu Mộc Linh 休
monsters/chichi/sprite.png  256×256 → Phụ Hộ Linh 父
monsters/ame/sprite.png     256×256 → Vũ Vân Linh 雨
monsters/aku/sprite.png     256×256 → Ác Tâm Linh 悪
monsters/an/sprite.png      256×256 → Ám Dạ Linh 暗
monsters/i_med/sprite.png   256×256 → Y Thuật Linh 医
monsters/i_intent/sprite.png 256×256 → Ý Niệm Linh 意
```

### Meaning effects

Monster có thể khai báo `effect` trong `CONFIG.MONSTERS`; renderer canvas dùng chung sẽ hiển thị hiệu ứng ở bài học, nghi thức thu phục và mini PvE.

- Số đếm `一・二・三・四・五・九`: `orbit-N`, với đúng N hạt sáng.
- Phương hướng `上・出・後・前・行`: vệt đi lên, tỏa ra, lùi, tiến và dấu chân.
- Thiên nhiên `日・月・東・魚・生・年`: quầng sáng, bình minh, bong bóng, mầm sống và bốn mùa.
- Khái niệm `音・国・大・人・十・本・中・長・時・見・今・分・間・金`: sóng âm, biên giới, mở rộng, kết nối, chữ thập, lật trang, tâm điểm, kéo dài, đồng hồ, scan, nhịp hiện tại, tách đôi, cổng và ánh kim.
- Nhóm mới `入・学・高・円・子`: mũi tên hội tụ, trang kiến thức bay, thước đo đi lên, vòng tròn đồng xu và các hạt sáng nảy vui nhộn.
- Nhóm mới `外・八・六・下・来・気・小・七・山・話`: hạt trôi ra ngoài, quỹ đạo đếm số, mũi tên đi xuống, vệt tiến lại gần, luồng khí, hạt sáng thu nhỏ, đường đỉnh núi và bong bóng hội thoại.
- Nhóm mới `女・北・午・百・書・先・名・川・千・水`: bước chân đối xứng, sao Bắc cực, nắng chính Ngọ, lưới 100 điểm, nét mực, mũi tên dẫn đầu, thẻ tên, dòng sông, chùm tinh tú và gợn nước.
- Nhóm mới `半・男・西・電・語・土・木・食・車・南`: hai nửa tách đôi, xung lực, mặt trời lặn, tia điện, hạt ngôn từ, đất vụn, lá rơi, hơi thức ăn, vệt bánh xe và la bàn chỉ Nam.
- Nhóm mới `何・万・校・毎・白・天・母・火・右・読`: dấu hỏi xoay, tinh tú, chuông trường, vòng lặp, ánh trắng, tia trời, trái tim, tàn lửa, mũi tên phải và trang sách bay.
- Nhóm hoàn tất N5 `友・左・休・父・雨`: liên kết bạn bè, mũi tên trái, lá nghỉ ngơi, khiên bảo hộ và giọt mưa.
- Batch N4 `悪・暗・医・意`: vết nứt năng lượng tối, đèn lồng mờ, dấu chữa lành và điểm sáng tập trung ý niệm.

Hiệu ứng chỉ dùng primitive canvas, không cần thêm sprite sheet và không làm thay đổi asset PNG gốc.

### Semantic sprite details

Ngoài hiệu ứng canvas, các mascot ưu tiên có thêm 1–2 đạo cụ pixel nhỏ nằm ngoài nét Kanji để người học liên tưởng nghĩa ngay từ silhouette. Đạo cụ phải là chi tiết phụ, không che nét chữ và không làm giảm khả năng đọc ở kích thước battle.

- `日`: mặt trời mọc và tia sáng nhỏ.
- `月`: trăng lưỡi liềm và sao.
- `時`: đồng hồ bỏ túi.
- `学`: sách mở và bút chì.
- `書`: bút lông, giọt mực và giấy cuộn.
- `食`: bát cơm nóng.
- `電`: hai tia điện nhỏ.
- `校`: chuông trường và bút chì.
- `本`: quyển sách nhỏ và ánh trang sách.
- `見`: kính lúp và điểm sáng quan sát.
- `生`: mầm cây non.
- `金`: đồng xu và ánh kim.
- `入`: cánh cửa mở và mũi tên đi vào.
- `山`: đỉnh tuyết và mây nhỏ.
- `話`: hai bong bóng hội thoại trống.
- `川`: giọt nước và gợn dòng chảy.
- `水`: splash nước và giọt bắn.
- `車`: bánh xe và vệt lăn ngắn.
- `木・火・友・左・休・父・雨`: đã có sẵn lá, lửa, ánh liên kết, chỉ hướng, cây nghỉ, khiên và mây mưa trong thiết kế sprite.

Để review cả catalog nhanh mà không phải mở từng file, có thể tạo contact sheet có nhãn:

```bash
swift scripts/make-sprite-contact-sheet.swift /tmp/kanjigo-sprites.png monId:Kanji ...
```

Khi thêm monster mới:

1. Tạo `assets/monsters/<monId>/sprite.png`.
2. Thêm cấu hình tương ứng vào `CONFIG.MONSTERS`.
3. Thêm `monId` vào nhóm spawn phù hợp trong `CONFIG.SPAWN`.

Nếu ảnh sinh ra bị bake nền caro sáng, dùng công cụ local để chỉ xóa vùng nền nối với mép ảnh, giữ nguyên màu trắng nằm trong mascot và xuất sprite RGBA `256×256`:

```bash
swift scripts/clean-checkerboard.swift input.png assets/monsters/<monId>/sprite.png
```

Sau khi thêm nhiều sprite, chạy audit và bộ làm sạch vùng kín để phát hiện/xóa các mảng nền sáng bị kẹt giữa nét Kanji mà vẫn giữ mắt, găng tay và highlight trắng:

```bash
swift scripts/audit-sprite-whitespace.swift assets/monsters/*/sprite.png
swift scripts/clean-sprite-whitespace.swift assets/monsters/*/sprite.png
```

`clean-sprite-whitespace.swift` dùng seed theo từng mascot; khi thêm một thiết kế có vùng kín mới, cần review hình và bổ sung seed thay vì tăng ngưỡng xóa trắng toàn ảnh.
