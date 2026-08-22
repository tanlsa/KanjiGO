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

Các ô học viện `7–9` trong map được phủ nền cỏ và vẽ bằng `world/academy.png`, nên không cần nằm trong tileset. `academy.png` là sprite RGBA `96×96 px` (footprint `3×3` tile); cửa chính nằm giữa ô dưới cùng để khớp `ACADEMY_DOOR` tại `(5, 3)`.

## Monsters

Mỗi monster có thư mục riêng theo đúng `monId` trong `CONFIG.MONSTERS`. Sprite hiện dùng tên `sprite.png`; sau này có thể đặt thêm `baby.png`, `adult.png`, `prime.png`, portrait hoặc effect trong cùng thư mục mà không làm rối asset của monster khác.

```text
monsters/yin/sprite.png  256×256 → Âm Thư Yêu 音
monsters/ri/sprite.png   256×256 → Nhật Quang 日
monsters/kuni/sprite.png 256×256 → Quốc Vương 国
monsters/nen/sprite.png  256×256 → Niên Thú 年
monsters/dai/sprite.png  256×256 → Đại Vương 大
monsters/fish/sprite.png 256×256 → Ngư Âm Tinh 魚 (hiện dùng hình Quốc Vương)
monsters/bar/sprite.png  256×151 → Nhất Bản 一
```

Khi thêm monster mới:

1. Tạo `assets/monsters/<monId>/sprite.png`.
2. Thêm cấu hình tương ứng vào `CONFIG.MONSTERS`.
3. Thêm `monId` vào nhóm spawn phù hợp trong `CONFIG.SPAWN`.
