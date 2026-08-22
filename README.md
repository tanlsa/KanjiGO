# 🎮 KanjiGO — Học Kanji On/Kun kiểu Pokémon

Game 2D top-down **offline** (double-click là chơi, không cần cài gì). Đọc đúng cách đọc
Kanji mới ra đòn. Có **Kanji Dex** để đổi pet đi sau lưng; Level/MP thuộc về Kanji đang gặp.

## ▶️ Chạy
Double-click **index.html** (Chrome/Edge/Firefox). Giữ nguyên thư mục `assets/` + `js/` cạnh `index.html`.

## 🎯 Điều khiển
- Overworld: `↑ ↓ ← →` di chuyển • giữ **`Shift`** để chạy • `Space` tương tác/câu cá • **`D`** mở Kanji Dex.
- Battle (realtime): bấm **`1–4`** chọn cách đọc • `Esc` bỏ chạy.
- Dex: `← → ↑ ↓` chọn • `Enter` cho pet đi cùng • `Esc/D` đóng.
- Giảng đường: đến cửa tòa 🏛️, nhấn `Space` • mini-check sai vẫn được qua.
- Nghi thức: gauntlet 5 câu, cần 4/5; thể lực hồi khi thắng bụi cỏ.
- Kỳ thi PvE: đến NPC ⛩, nhấn `Space` • 10 câu, xếp hạng A/B/C/D.

## ✨ Cập nhật bản này
1. **World 32×24 có nhiều phân khu:** học viện, quảng trường, hồ/bến thuyền, đồng cỏ, rừng và đấu trường được nối bằng các trục đường rõ ràng.
2. **Chạy và câu cá có animation:** giữ `Shift` để chạy nhanh; đứng sát hồ, quay mặt về nước và nhấn `Space` để thả cần.
3. **Player/NPC FPT mới:** spritesheet sạch viền, áo cam và thẻ nhân viên rõ ở kích thước tile `32×32`.
4. **Khung học được thiết kế lại — hết đè/chèn chữ.** Câu hỏi, nghĩa, 4 đáp án và dòng
   trạng thái nay nằm ở các vùng riêng biệt; feedback "đúng/sai" hiển thị dạng **banner nổi**
   phía trên khung nên không chồng lên đáp án. (chỉnh chiều cao khung ở `js/config.js → UI.panelH`).
5. **Combat có Attack Gauge và tuyệt kỹ:** trả lời đúng đẩy lùi lượt đánh của quái, trả lời
   nhanh nhận PERFECT; đủ 3 năng lượng pet tự tung skill. Sai/hết giờ khiến quái phản công,
   sau đó hiện đáp án đúng trong khoảng 1 giây.
6. **Trang Admin nhập liệu** (`admin.html`): thêm chữ/câu cực nhanh, không cần đụng code.
7. **Core gameplay loop v2**: mastery theo từng kanji, SRS Leitner, tòa giảng đường/thu phục,
   bụi cỏ weighted theo chữ gỉ và kỳ thi PvE 10 câu.
8. **Pokédex-style Dex**: hiển thị toàn bộ chữ; chữ chưa thu phục là silhouette và không thể chọn làm pet.
9. **Mastery 10 level**: MP theo từng Kanji, level không tụt; Recall và win-streak biến động để điều hướng ôn tập.

## 🛠️ Admin thêm Kanji & câu hỏi (2 cách)

### Cách 1 — Dùng `admin.html` (khuyên dùng, không cần sửa code)
1. Mở **admin.html**.
2. Dán bảng từ **Excel/Google Sheets** vào 2 ô (mỗi cột cách nhau bằng **Tab**), hoặc dán CSV.
   - Bảng **KANJI**: `key, char, meaning, on, kun, monId`
   - Bảng **CÂU HỎI**: `word, mean, target, answer, romaji, type` (type = `on`/`kun`)
   - Nhiều cách đọc On/Kun ngăn nhau bằng `,` hoặc `;`.
   - `monId` phải khớp 1 id trong `CONFIG.MONSTERS` (`yin, ri, kuni, nen, dai, fish, bar`).
3. Bấm **🔍 Xem trước & Kiểm tra** để soát lỗi/cảnh báo.
4. Bấm **✅ Áp dụng vào game** → lưu vào trình duyệt, mở lại `index.html` là chơi ngay.
   Hoặc **⬇️ Tải xuống kanji.js** để thay file vĩnh viễn (dùng cho bản đóng gói/chia sẻ).

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
Tòa nhà dùng riêng file `assets/world/academy.png` kích thước khuyến nghị **96×96 px**, nền trong suốt.
Chỉ cần thay file này là hình trong game được cập nhật; không cần sửa bản đồ hay engine.
Có thể chạy `tools/make_academy.ps1` để sinh lại hình mẫu trên Windows.

## ⚙️ Chỉnh nhanh (js/config.js)
- `UI.panelH` — chiều cao khung câu hỏi (tăng nếu muốn thoáng hơn).
- `COMBAT.wrongStun` — thời gian xem lại đáp án khi sai (ms). Mặc định `1000`.
- `COMBAT.botMinMs/botMaxMs` — thời gian đầy Attack Gauge; `perfectMs`, `gaugePush`,
  `energyMax`, `specialMultiplier` điều chỉnh PERFECT và tuyệt kỹ.
- `KLEVEL` — threshold MP, label, Recall/streak, damage/HP/pet scaling theo Kanji.
- `PET.monId` — pet ban đầu.

## 🧩 Mở rộng tiếp
- Bộ N4/N3 đầy đủ (dán 1 lần qua admin.html). 2) Save/Load tiến trình. 3) Thêm animation/âm thanh riêng cho từng hệ quái.
 
