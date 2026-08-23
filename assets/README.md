# KanjiGO assets

Asset được chia theo chức năng để dễ mở rộng:

```text
assets/
├── characters/
│   ├── player.png
│   ├── player-bicycle.png
│   └── npc.png
├── world/
│   ├── tileset.png
│   └── academy.png
└── monsters/
    └── <monId>/
        └── sprite.png
```

## Characters

`player.png`, `player-bicycle.png` và `npc.png` là spritesheet RGBA `128×128 px`, gồm `4×4` cell `32×32 px`. Thứ tự hàng phải khớp `DIR_ROW`: `down`, `left`, `right`, `up`. `player-bicycle.png` hiện là turnaround chuẩn: mỗi hàng lặp lại cùng một pose tĩnh bốn lần; hàng `right` được mirror trực tiếp từ `left` để khóa tuyệt đối tỷ lệ và hình học. Rider không lấy từ ảnh AI: pipeline ghép nguyên pixel theo từng hướng từ `player.png` lên resource xe, giữ đồng nhất tóc, khuôn mặt, đồng phục cam và thẻ FPT. Animation bàn đạp sẽ được tạo sau từ bốn canonical pose này.

Tạo lại sheet xe đạp từ turnaround xe `2×2` (`down`, `left`, `right`, `up`):

```sh
swift scripts/prepare-character-spritesheet.swift BIKE_INPUT.png assets/characters/player-bicycle.png --turnaround --player assets/characters/player.png
```

## World

`world/tileset.png` là strip ngang `224×32 px`, gồm 7 tile `32×32 px` theo thứ tự:

```text
0 cỏ | 1 cây | 2 nước | 3 đường | 4 hoa | 5 bụi cỏ | 6 thuyền
```

Các ô học viện `7–9` trong map được phủ nền cỏ và vẽ bằng `world/academy.png`, nên không cần nằm trong tileset. `academy.png` là sprite RGBA `160×128 px` (footprint `5×4` tile); cửa chính nằm giữa ô dưới cùng để khớp `ACADEMY_DOOR` tại `(5, 4)`.

## Monsters

Mỗi monster có thư mục riêng theo đúng `monId` trong `CONFIG.MONSTERS`. Sprite hiện dùng tên `sprite.png`; sau này có thể đặt thêm `baby.png`, `adult.png`, `prime.png`, portrait hoặc effect trong cùng thư mục mà không làm rối asset của monster khác.

Quy chuẩn khuôn mặt: mỗi mascot Kanji chỉ có đúng một cặp mắt cân đối (`2` mắt tổng cộng). Không đặt thêm mắt trên radical, đạo cụ hoặc các khoang nét khác; luôn kiểm tra cả sprite riêng lẻ và contact sheet trước khi đưa asset vào game.

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
monsters/i_by/sprite.png     256×256 → Dĩ Dẫn Linh 以
monsters/hiku/sprite.png     256×256 → Dẫn Lực Linh 引
monsters/institute/sprite.png 256×256 → Viện Hộ Linh 院
monsters/member/sprite.png   256×256 → Viên Đội Linh 員
monsters/un/sprite.png       256×256 → Vận Luân Linh 運
monsters/ei/sprite.png       256×256 → Anh Hoa Linh 英
monsters/utsu/sprite.png     256×256 → Ánh Chiếu Linh 映
monsters/tooi/sprite.png     256×256 → Viễn Lộ Linh 遠
monsters/ya/sprite.png       256×256 → Ốc Xá Linh 屋
monsters/uta/sprite.png      256×256 → Ca Âm Linh 歌
monsters/natsu/sprite.png    256×256 → Hạ Nhật Linh 夏
monsters/ie/sprite.png       256×256 → Gia Hộ Linh 家
monsters/ga_art/sprite.png   256×256 → Họa Sắc Linh 画
monsters/umi/sprite.png      256×256 → Hải Triều Linh 海
monsters/kai_turn/sprite.png 256×256 → Hồi Chuyển Linh 回
monsters/hiraku/sprite.png   256×256 → Khai Môn Linh 開
monsters/kai_world/sprite.png 256×256 → Giới Cầu Linh 界
monsters/tanoshi/sprite.png  256×256 → Lạc Âm Linh 楽
monsters/kan_building/sprite.png 256×256 → Quán Hộ Linh 館
monsters/kan_han/sprite.png  256×256 → Hán Mặc Linh 漢
monsters/samui/sprite.png    256×256 → Hàn Băng Linh 寒
monsters/kao/sprite.png      256×256 → Nhan Diện Linh 顔
monsters/kaeru/sprite.png    256×256 → Quy Gia Linh 帰
monsters/okiru/sprite.png    256×256 → Khởi Thân Linh 起
monsters/kyuu_research/sprite.png 256×256 → Cứu Nghiên Linh 究
monsters/isogu/sprite.png    256×256 → Cấp Tốc Linh 急
monsters/ushi/sprite.png     256×256 → Ngưu Lực Linh 牛
monsters/saru/sprite.png     256×256 → Khứ Hành Linh 去
monsters/tsuyoi/sprite.png   256×256 → Cường Lực Linh 強
monsters/oshieru/sprite.png  256×256 → Giáo Đạo Linh 教
monsters/kyou_capital/sprite.png 256×256 → Kinh Đô Linh 京
monsters/gyou_business/sprite.png 256×256 → Nghiệp Cơ Linh 業
monsters/chikai/sprite.png   256×256 → Cận Lộ Linh 近
monsters/gin/sprite.png      256×256 → Ngân Quang Linh 銀
monsters/ku_district/sprite.png 256×256 → Khu Giới Linh 区
monsters/kubi/sprite.png      256×256 → Thủ Cảnh Linh 首
monsters/shu_main/sprite.png  256×256 → Chủ Vương Linh 主
monsters/aki/sprite.png       256×256 → Thu Diệp Linh 秋
monsters/atsumeru/sprite.png  256×256 → Tập Hợp Linh 集
monsters/narau/sprite.png     256×256 → Tập Luyện Linh 習
monsters/owaru/sprite.png     256×256 → Chung Kỳ Linh 終
monsters/sumu/sprite.png      256×256 → Trú Gia Linh 住
monsters/omoi_heavy/sprite.png 256×256 → Trọng Lực Linh 重
monsters/haru/sprite.png      256×256 → Xuân Hoa Linh 春
monsters/tokoro/sprite.png    256×256 → Sở Địa Linh 所
monsters/atsui/sprite.png     256×256 → Thử Nhật Linh 暑
monsters/ba/sprite.png        256×256 → Trường Địa Linh 場
monsters/noru/sprite.png      256×256 → Thừa Phong Linh 乗
monsters/iro/sprite.png       256×256 → Sắc Họa Linh 色
monsters/mori/sprite.png      256×256 → Sâm Lâm Linh 森
monsters/kokoro/sprite.png    256×256 → Tâm Quang Linh 心
monsters/oya/sprite.png       256×256 → Thân Tình Linh 親
monsters/shin_truth/sprite.png 256×256 → Chân Tinh Linh 真
monsters/susumu/sprite.png    256×256 → Tiến Phong Linh 進
monsters/zu/sprite.png        256×256 → Đồ Bản Linh 図
monsters/ao/sprite.png        256×256 → Thanh Lam Linh 青
monsters/tadashii/sprite.png  256×256 → Chính Chuẩn Linh 正
monsters/koe/sprite.png       256×256 → Thanh Âm Linh 声
monsters/yo/sprite.png        256×256 → Thế Giới Linh 世
monsters/aka/sprite.png       256×256 → Xích Hỏa Linh 赤
monsters/yuu/sprite.png       256×256 → Tịch Dương Linh 夕
monsters/kiru/sprite.png      256×256 → Thiết Đoạn Linh 切
monsters/toku/sprite.png      256×256 → Thuyết Ngôn Linh 説
monsters/arau/sprite.png      256×256 → Tẩy Thủy Linh 洗
monsters/hayai/sprite.png     256×256 → Tảo Nhật Linh 早
monsters/hashiru/sprite.png   256×256 → Tẩu Phong Linh 走
monsters/okuru/sprite.png     256×256 → Tống Tín Linh 送
monsters/zoku/sprite.png      256×256 → Gia Tộc Linh 族
monsters/mura/sprite.png      256×256 → Thôn Mộc Linh 村
monsters/karada/sprite.png    256×256 → Thể Lực Linh 体
monsters/futoi/sprite.png     256×256 → Thái Dương Linh 太
monsters/matsu/sprite.png     256×256 → Đãi Thời Linh 待
monsters/kasu/sprite.png      256×256 → Thải Dụng Linh 貸
monsters/dai_platform/sprite.png 256×256 → Đài Tọa Linh 台
monsters/dai_generation/sprite.png 256×256 → Đại Thế Linh 代
monsters/dai_topic/sprite.png  256×256 → Đề Vấn Linh 題
monsters/mijikai/sprite.png    256×256 → Đoản Xích Linh 短
monsters/shiru/sprite.png      256×256 → Tri Tuệ Linh 知
monsters/chi_ground/sprite.png 256×256 → Địa Mạch Linh 地
monsters/ike/sprite.png        256×256 → Trì Thủy Linh 池
monsters/cha/sprite.png        256×256 → Trà Hương Linh 茶
monsters/kiru_wear/sprite.png  256×256 → Trứ Y Linh 着
monsters/hiru/sprite.png       256×256 → Trú Nhật Linh 昼
monsters/sosogu/sprite.png     256×256 → Chú Thủy Linh 注
monsters/machi/sprite.png      256×256 → Phố Đăng Linh 町
monsters/tori/sprite.png       256×256 → Điểu Vũ Linh 鳥
monsters/asa/sprite.png        256×256 → Triêu Dương Linh 朝
monsters/tooru/sprite.png      256×256 → Thông Lộ Linh 通
monsters/otouto/sprite.png     256×256 → Đệ Hòa Linh 弟
monsters/hikui/sprite.png      256×256 → Đê Vị Linh 低
monsters/korobu/sprite.png     256×256 → Chuyển Luân Linh 転
monsters/ta_ricefield/sprite.png 256×256 → Điền Thủy Linh 田
monsters/miyako/sprite.png     256×256 → Đô Thành Linh 都
monsters/do_degree/sprite.png  256×256 → Độ Lượng Linh 度
monsters/kotaeru/sprite.png    256×256 → Đáp Án Linh 答
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
- Batch N4 `以・引・院・員・運・英・映・遠・屋・歌・夏・家・画・海・回`: vệt dẫn hướng, lực kéo, dấu chữa lành, liên kết nhóm, vệt bánh xe, ánh kim, scan phản chiếu, đường xa, khiên mái nhà, sóng âm, tia nắng, vòng ôm gia đình, nét mực, gợn biển và vòng lặp.
- Batch N4 `開・界・楽・館・漢・寒・顔・帰・起・究・急・牛・去・強・教・京・業・近・銀・区`: cổng mở, biên giới, sóng âm, khiên tòa nhà, nét mực, ánh băng, scan khuôn mặt, vệt quay về, chuyển động đi lên, trang học, tia tốc độ, xung lực, vệt rời đi, sức mạnh, tia trời, bánh răng, tiến gần, vòng đồng xu và đường biên khu vực.
- Batch N4 `計・兄・軽・犬・研・県・建・験・元・工・広・考・光・好・合・黒・菜・作・産・紙`: nhịp đồng hồ, khiên bảo hộ, gió nhẹ, dấu chân, trang nghiên cứu, ranh giới tỉnh, chuyển động xây lên, tia scan, mầm sống, vệt bánh xe, tỏa rộng, hội tụ suy nghĩ, quầng sáng, vòng ôm trái tim, lực ghép vào, vết nứt tối, mầm rau, xung lực chế tác, sức sống và trang giấy lật.
- Batch N4 `思・姉・止・市・仕・死・使・始・試・私・字・自・事・持・室・質・写・者・借・弱`: hội tụ suy nghĩ, khiên bảo hộ, nhịp dừng, tia đô thị, vệt công việc, vết nứt tối, vệt hành động, bình minh khởi đầu, tia kiểm tra, lực hướng vào, nét mực, scan phản chiếu, nhịp công việc, xung lực cầm giữ, khiên căn phòng, scan chất lượng, ánh chớp máy ảnh, dấu chân, vòng trao trả và vết nứt yếu điểm.
- Batch N4 `首・主・秋・集・習・終・住・重・春・所・暑・場・乗・色・森・心・親・真・進・図`: nhịp trung tâm, ánh chủ đạo, lá thu, lực hội tụ, trang học, hoàng hôn kết thúc, khiên mái ấm, lực chìm nặng, bốn mùa, đường biên địa điểm, quầng nắng, mốc sân, vệt tiến, hạt sắc màu, lá rừng, vòng tim, khiên gia đình, ánh chân thật, vệt tiến lên và tia quét bản đồ.
- Batch N4 `青・正・声・世・赤・夕・切・説・洗・早・走・送・族・村・体・太・待・貸・台・代`: gợn xanh, tia kiểm tra, sóng âm, tinh tú thế giới, tàn lửa đỏ, hoàng hôn, nhát cắt, bong bóng thuyết minh, gợn nước, bình minh, dấu chân, vệt gửi đi, liên kết gia tộc, sức sống làng, xung lực cơ thể, tỏa rộng, đồng hồ chờ, trao ra, bệ nâng và vòng thay thế.
- Batch hoàn tất N4 `題・短・知・地・池・茶・着・昼・注・町・鳥・朝・通・弟・低・転・田・都・度・答`: quỹ đạo câu hỏi, thu ngắn, hội tụ tri thức, đất vụn, gợn ao, hơi trà, khiên áo, tia chính Ngọ, dòng rót, ranh giới phố, gió lông vũ, bình minh, vệt thông hành, nhịp em nhỏ, lực hạ thấp, bánh xe, sức sống đồng ruộng, tia đô thị, scan đo lường và ánh đáp án.

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
- `以`: dấu mốc và mũi tên tiến.
- `引`: dây kéo căng.
- `院`: tòa viện và dấu y tế.
- `員`: thẻ thành viên và nhóm người.
- `運`: bánh xe vận chuyển.
- `英`: lá nguyệt quế và ánh xuất sắc.
- `映`: khung phim và ánh phản chiếu.
- `遠`: núi xa và đường nét đứt.
- `屋`: mái nhà và ngói nhỏ.
- `歌`: micro và nốt nhạc.
- `夏`: mặt trời hè và quạt xếp.
- `家`: mái ấm và trái tim.
- `画`: cọ, bảng màu và khung tranh.
- `海`: sóng, giọt nước và vỏ sò.
- `回`: mũi tên xoay vòng.
- `開`: hai cánh cửa mở và ánh sáng.
- `界`: địa cầu và các mốc ranh giới.
- `楽`: chuông tay và nốt nhạc.
- `館`: mái tòa nhà và chìa khóa.
- `漢`: bút mực và cuộn giấy học chữ.
- `寒`: khăn quàng, bông tuyết và tinh thể băng.
- `顔`: gương cầm tay và ánh phản chiếu.
- `帰`: đèn nhà và vệt quay về.
- `起`: đồng hồ báo thức và tia chuyển động đi lên.
- `究`: kính lúp và sách nghiên cứu.
- `急`: đồng hồ bấm giờ và vệt tốc độ.
- `牛`: sừng nhỏ và chuông bò.
- `去`: dấu chân rời đi và vệt chuyển động.
- `強`: tạ tay và hào quang sức mạnh.
- `教`: sách mở và que chỉ bài.
- `京`: mái chùa và ánh đèn đô thị.
- `業`: bánh răng và dụng cụ làm việc.
- `近`: hai mốc vị trí đặt gần nhau.
- `銀`: đồng bạc và ánh kim loại.
- `区`: ô bản đồ và góc đánh dấu ranh giới.
- `計`: bàn tính và thước đo.
- `兄`: ô bảo hộ và dải băng gia đình.
- `軽`: lông vũ và bóng bay.
- `犬`: vòng cổ, thẻ tên và khúc xương.
- `研`: đá mài và kính lúp.
- `県`: ghim vị trí và bản đồ vùng.
- `建`: búa và bản thiết kế.
- `験`: phiếu kiểm tra và dấu xác nhận.
- `元`: rễ cây, mầm non và gợn nguồn.
- `工`: bánh răng và búa chế tác.
- `広`: tia tỏa rộng và dải băng trống.
- `考`: đám mây suy nghĩ và bóng đèn ý tưởng.
- `光`: đèn lồng và tia sáng.
- `好`: trái tim và bông hoa.
- `合`: hai mảnh ghép và tia kết nối.
- `黒`: giọt mực và nhật thực.
- `菜`: rau lá và giỏ thu hoạch.
- `作`: búa và cờ lê chế tác.
- `産`: quả trứng và mầm non.
- `紙`: chồng giấy và hạc origami.
- `思`: đám mây suy nghĩ và tia tim.
- `姉`: dải băng bảo hộ và hoa cài tóc.
- `止`: bàn tay dừng và vệt phanh.
- `市`: đường chân trời đô thị và đèn đường.
- `仕`: khay phục vụ và hộp dụng cụ.
- `死`: hoa héo và linh hồn mờ dần.
- `使`: trượng công cụ và mũi tên hành động.
- `始`: cờ xuất phát và mặt trời mọc.
- `試`: phiếu kiểm tra và bút chì.
- `私`: nhật ký cá nhân và chìa khóa.
- `字`: bút lông và sách học chữ.
- `自`: gương soi và động tác chỉ bản thân.
- `事`: bảng công việc và bánh răng.
- `持`: túi xách và tia cầm giữ.
- `室`: cửa phòng, chìa khóa và đèn nhỏ.
- `質`: cân thăng bằng và kính soi đá quý.
- `写`: máy ảnh và ảnh chụp tức thời.
- `者`: thẻ nhận diện người.
- `借`: sách mượn và mũi tên hoàn trả.
- `弱`: khiên nứt và băng cá nhân.
- `首`: khăn/cổ áo nhỏ.
- `主`: vương miện chủ đạo.
- `秋`: lá phong mùa thu.
- `集`: các điểm sáng hội tụ.
- `習`: vở luyện tập và mũi tên lặp.
- `終`: cờ đích ca-rô.
- `住`: móc khóa ngôi nhà.
- `重`: tạ tay nặng.
- `春`: hoa anh đào.
- `所`: biển chỉ đường và ghim vị trí.
- `暑`: mặt trời và giọt mồ hôi.
- `場`: cờ đánh dấu mặt sân.
- `乗`: vé phương tiện và vệt chuyển động.
- `色`: bảng màu và cọ vẽ.
- `森`: cành lá và quả thông.
- `心`: các tia tim nhỏ.
- `親`: ảnh gia đình được ôm giữ.
- `真`: tinh thể trong và ánh xác nhận.
- `進`: cờ cùng mũi tên tiến.
- `図`: bản đồ gấp và la bàn.
- `青`: cọ màu xanh và giọt màu.
- `正`: dấu kiểm cùng thước chuẩn.
- `声`: loa phát thanh và sóng âm.
- `世`: địa cầu nhỏ và ánh sao.
- `赤`: quả táo đỏ và bảng màu.
- `夕`: mặt trời lặn và sao chiều.
- `切`: kéo cắt và mẩu giấy.
- `説`: que chỉ cùng bong bóng lời nói.
- `洗`: xà phòng, bong bóng và splash nước.
- `早`: đồng hồ báo thức và bình minh.
- `走`: giày chạy, vệt tốc độ và dải đích.
- `送`: phong bì cùng mũi tên gửi đi.
- `族`: cờ gia huy và huy hiệu nhóm.
- `村`: ngôi nhà nhỏ và nhành cây.
- `体`: nhịp tim và băng tay thể lực.
- `太`: thước đo vòng và mặt trời nhỏ.
- `待`: đồng hồ đeo tay và đồng hồ cát.
- `貸`: chìa khóa được trao ra.
- `台`: bục sân khấu và micro.
- `代`: gậy tiếp sức và mũi tên hoán đổi.
- `題`: thẻ câu hỏi và bảng bài tập.
- `短`: thước ngắn và thước dây.
- `知`: sách mở và bóng đèn tri thức.
- `地`: mô đất và ghim vị trí.
- `池`: lá sen, nụ sen và gợn ao.
- `茶`: tách trà nóng và lá trà.
- `着`: áo khoác trên móc treo.
- `昼`: mặt trời chính Ngọ và hộp cơm trưa.
- `注`: giọt nước đang rót và biển cảnh báo.
- `町`: nhà phố và đèn đường.
- `鳥`: lông chim và tổ chim.
- `朝`: mặt trời mọc và đồng hồ báo thức.
- `通`: vé đi lại và mũi tên đường đi.
- `弟`: cà vạt nhỏ và huy hiệu gia đình.
- `低`: thước đo đi xuống và thanh thấp.
- `転`: bánh xe và mũi tên xoay.
- `田`: bông lúa và mặt ruộng ngập nước.
- `都`: đường chân trời đô thị và vương miện thủ đô.
- `度`: nhiệt kế và thước đo góc.
- `答`: phiếu đáp án, dấu kiểm và bút chì.
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
