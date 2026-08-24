# 🎮 KanjiGO — Học Kanji On/Kun kiểu Pokémon

Game 2D top-down **offline** (double-click là chơi, không cần cài gì). Đọc đúng cách đọc
Kanji mới ra đòn. Có **Kanji Dex** để đổi pet đi sau lưng; Level/MP thuộc về Kanji đang gặp.

## ✅ Automated checks

Requires Node.js 18 or newer. Run the dependency-free test suite before publishing content changes:

```bash
npm test
```

The suite checks JavaScript syntax, curriculum order, Kanji/question/monster links, transparent sprite files, spawn pools, map references, progression gates, CSV templates, imported-data merging, page script order, save/KP migration, Skill Tree rules, and core battle behavior. GitHub Actions also runs it automatically on every push and pull request.

After editing packaged content in `js/kanji.js`, regenerate both admin CSV templates with `npm run sync:data`.

## ▶️ Chạy
Double-click **index.html** (Chrome/Edge/Firefox). Giữ nguyên thư mục `assets/` + `js/` cạnh `index.html`.

## 🎯 Điều khiển
- Overworld: `↑ ↓ ← →` di chuyển • giữ **`Shift`** để chạy • `Space` tương tác/câu cá • **`D`** mở Kanji Dex • **`K`** mở Skill Tree.
- Battle (realtime): bấm **`1–4`** chọn cách đọc • `Esc` bỏ chạy.
- Dex: cuộn chuột hoặc kéo để xem danh sách • `← → ↑ ↓`, `Page Up/Down`, `Home/End` để chọn • `R` đổi cách sort • `G` bật/tắt nhóm JLPT N5/N4 • `Enter` cho pet đi cùng • `Esc/D` đóng.
- Skill Tree: kéo/scroll để pan cây node • dùng phím mũi tên để chọn theo hướng • `Enter` mở node • `R` reset Perk • `Esc/K` đóng. Trên mobile dùng nút `SKILL`.
- Giảng đường: đến cửa tòa 🏛️, nhấn `Space` • chọn học theo thứ tự KanjiDex hoặc tự chọn một Kanji chưa unlock.
- Nghi thức: gauntlet 5 câu, cần 4/5; thể lực hồi khi thắng bụi cỏ.
- Trainer Arena: gặp Trainer chủ đề và nhấn `Space`; thu phục tối thiểu 3 chữ đúng nhóm để mở trận. Mỗi Trainer dùng tối đa 5 mascot đã unlock trong nhóm đó.
- Boss N5: thu phục đủ 79 chữ N5 và thắng tối thiểu 10/15 Trainer; vượt bài thi 80% để nhận huy hiệu N5.

## ✨ Cập nhật bản này
1. **World 32×24 có nhiều phân khu:** học viện, quảng trường, hồ/bến thuyền, đồng cỏ, rừng và đấu trường được nối bằng các trục đường rõ ràng.
2. **Chạy và câu cá có animation:** giữ `Shift` để chạy nhanh; đứng sát hồ, quay mặt về nước và nhấn `Space` để thả cần.
3. **Player/NPC FPT mới:** player áo cam, NPC áo xanh và thẻ nhân viên rõ ở kích thước tile `32×32`; bốn hướng dùng chung tỷ lệ, baseline và canonical head để animation không rung hình.
4. **Khung học được thiết kế lại — hết đè/chèn chữ.** Câu hỏi, nghĩa, 4 đáp án và dòng
   trạng thái nay nằm ở các vùng riêng biệt; feedback "đúng/sai" hiển thị dạng **banner nổi**
   phía trên khung nên không chồng lên đáp án. (chỉnh chiều cao khung ở `js/config.js → UI.panelH`).
5. **Combat có Attack Gauge và tuyệt kỹ:** trả lời đúng đẩy lùi lượt đánh của quái, trả lời
   nhanh nhận PERFECT; đủ 3 năng lượng pet tự tung skill. Sai/hết giờ khiến quái phản công,
   sau đó hiện đáp án đúng trong khoảng 1 giây.
6. **Giảng đường học tập mới:** chỉ dạy Kanji chưa unlock, có hai chế độ học, lesson 5 bước,
   lưu bài đang dở, ba mini-check, nghi thức trực quan và màn hình tổng kết unlock. Ví dụ từ
   vựng được tách thành Kanji mục tiêu/chữ hỗ trợ, có furigana và quiz đọc/nghĩa toàn từ.
7. **Trang Admin nhập liệu** (`admin.html`): thêm chữ/câu cực nhanh, không cần đụng code.
8. **Core gameplay loop v2**: mastery theo từng kanji, SRS Leitner, tòa giảng đường/thu phục,
   bụi cỏ weighted theo chữ gỉ và kỳ thi PvE 10 câu.
9. **Pokédex-style Dex**: hiển thị toàn bộ chữ; chữ chưa thu phục là silhouette và không thể chọn làm pet.
10. **Mastery 10 level**: MP theo từng Kanji, level không tụt; Recall và win-streak biến động để điều hướng ôn tập.
11. **KP & Skill Tree:** capture/Level milestone cấp KP một lần, save cũ được nhận bù an toàn. Hiện có 15 node hoạt động trên ba nhánh, gồm Radar I/II, Bicycle/Gear II/Auto Ride, Meaning Lens I/II, Review Focus I/II, Focus I/II, Combo Guard I/II và Vitality I/II.
12. **N5 Trainer Arena:** kiến trúc thi đấu ở quảng trường giữa có 15 Trainer theo chủ đề. Đội hình tự lấy tối đa 5 Kanji đã thu phục, ưu tiên chữ Recall yếu; chiến thắng được lưu và 10 huy hiệu Trainer là điều kiện thách đấu Boss N5.

## 🛠️ Admin thêm Kanji & câu hỏi (2 cách)

### Cách 1 — Dùng `admin.html` (khuyên dùng, không cần sửa code)
1. Mở **admin.html**.
2. Bấm **📥 Nhập Excel** để mở workbook `.xlsx/.xls/.ods/.csv`, hoặc dán bảng từ **Excel/Google Sheets** vào 2 ô.
   - Bảng **KANJI**: `key, char, meaning, on, kun, monId, jlpt`
   - Bảng **CÂU HỎI**: `word, mean, target, answer, romaji, type, wordReading, wordRomaji, parts, sentence, sentenceReading, sentenceMeaning, id`
   - `parts`: `text~reading~romaji~meaning~role`, nhiều segment ngăn bằng `|`.
   - `sentence`: câu ngữ cảnh có Kanji; `sentenceReading`: cùng câu bằng kana; `sentenceMeaning`: bản dịch tiếng Việt. Bỏ trống thì game tự sinh fallback cho cả ba dạng đề ngữ cảnh.
   - `id`: mã vocabulary ổn định. Không nên đổi sau khi nội dung đã phát hành vì tiến độ từng từ được gắn với ID này.
   - Nhiều cách đọc On/Kun ngăn nhau bằng `,` hoặc `;`.
   - `monId` phải khớp một id trong `CONFIG.MONSTERS`; xem danh sách hiện hành tại `assets/README.md`.
   - `jlpt` nhận `N5`, `N4` hoặc `BONUS`. Nếu bỏ trống, game tự đối chiếu `js/content-catalog.js`.

Danh sách chuẩn và tiến độ sản xuất content nằm tại [KANJI-CONTENT-TRACKER.md](KANJI-CONTENT-TRACKER.md). N4 chỉ mở sau khi người chơi thu phục đủ 79 chữ N5 và vượt Gym N5 với tối thiểu 80% câu đúng.
3. Bấm **🔍 Xem trước & Kiểm tra** để soát lỗi/cảnh báo.
4. Bấm **✅ Áp dụng vào game** → lưu vào trình duyệt, mở lại `index.html` là chơi ngay.
   Có thể bấm **📊 Xuất Excel** để tải workbook gồm `KANJI`, `QUESTIONS`, `HUONG_DAN`; hoặc **⬇️ Tải xuống kanji.js** để thay file vĩnh viễn.

> File mẫu để dán/nhập sẵn ở thư mục `data/`: `kanji-template.csv`, `questions-template.csv`.

### Cách 2 — Sửa trực tiếp `js/kanji.js`
Thêm entry vào `KANJI` (Dex) và `QUESTIONS` (ngân hàng câu hỏi) theo schema ghi ở đầu file.

## 📁 Cấu trúc
```
KanjiGO/
├─ index.html            # màn chơi chính
├─ admin.html            # 🛠️ công cụ nhập Kanji/câu hỏi
├─ assets/               # characters/, world/, monsters/<monId>/
├─ data/                 # file CSV mẫu cho admin
└─ js/
   ├─ config.js          # cấu hình: UI.panelH, COMBAT.wrongStun, KLEVEL, PET, SPAWN…
   ├─ kanji.js           # dữ liệu học MẶC ĐỊNH (KANJI + QUESTIONS + DISTRACTORS)
   ├─ data-loader.js     # nạp dữ liệu admin import (localStorage) đè lên mặc định
   ├─ map.js             # bản đồ + NPC
   └─ game.js            # engine (overworld + combat quiz + dex)
```

### Thay hình tòa Giảng đường
Tòa nhà dùng riêng file `assets/world/academy.png` kích thước khuyến nghị **160×128 px**, nền trong suốt.
Chỉ cần thay file này là hình trong game được cập nhật; không cần sửa bản đồ hay engine.
Có thể chạy `tools/make_academy.ps1` để sinh lại hình mẫu trên Windows.

## ⚙️ Chỉnh nhanh (js/config.js)
- `UI.panelH` — chiều cao khung câu hỏi (tăng nếu muốn thoáng hơn).
- `COMBAT.wrongStun` — thời gian xem lại đáp án khi sai (ms). Mặc định `1000`.
- `COMBAT.botMinMs/botMaxMs` — thời gian đầy Attack Gauge; `perfectMs`, `gaugePush`,
  `energyMax`, `specialMultiplier` điều chỉnh PERFECT và tuyệt kỹ.
- `KLEVEL` — threshold MP, label, Recall/streak, damage/HP/pet scaling theo Kanji.
- `PET.monId` — pet ban đầu.
- `PROGRESSION.kp` — milestone và lượng KP nhận được.
- `SKILL_TREE.nodes` — cost, prerequisite, requirement và effect của từng node.
- `TRAINER_ARENA` — roster chủ đề, số chữ tối thiểu, số câu, pass ratio và số Trainer cần thắng trước Boss.
- Radar II: nhấn `R` hoặc chạm thanh Radar để đổi ưu tiên encounter.
- Bicycle: nhấn `B` hoặc nút `BIKE` trên thiết bị cảm ứng để bật/tắt.
- Auto Ride: sau khi mở node, nhấn `P` hoặc nút `AUTO` để tự tìm bụi cỏ; trận đấu vẫn do người chơi trả lời và patrol tự tiếp tục sau thắng/thua. Bấm chạy thoát sẽ đồng thời tắt Auto Ride, kể cả khi escape thất bại.

## 🧩 Mở rộng tiếp
- Bộ N4/N3 đầy đủ (dán 1 lần qua admin.html). 2) Save/Load tiến trình. 3) Thêm animation/âm thanh riêng cho từng hệ quái.
 
