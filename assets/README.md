# KanjiGO assets

Thư mục này chứa các asset legacy dùng chung của game:

```text
assets/
├── player.png
├── npc.png
├── tileset.png
└── academy.png
```

`tileset.png` là một strip ngang `224×32 px`, gồm 7 tile `32×32 px` theo đúng thứ tự:

```text
0 cỏ | 1 cây | 2 nước | 3 đường | 4 hoa | 5 bụi cỏ | 6 thuyền
```

Các ô học viện `7–9` trong map được engine phủ nền cỏ và vẽ bằng `academy.png`, nên không cần nằm trong tileset.

`academy.png` là sprite RGBA `96×96 px` (footprint `3×3` tile), nền trong suốt. Cửa chính được căn giữa ô dưới cùng để khớp `ACADEMY_DOOR` tại vị trí `(5, 3)` trong map.

`player.png` và `npc.png` là spritesheet RGBA `128×128 px`, gồm `4×4` frame `32×32 px`. Thứ tự hàng phải khớp `DIR_ROW`: `down`, `left`, `right`, `up`; mỗi hàng chứa 4 frame đi bộ. Engine hiện dùng frame `down:0` cho NPC tĩnh nhưng giữ đủ sheet để có thể animate sau này.

Các monster legacy dùng sprite RGBA nền trong suốt và được engine tự scale cho battle/pet. Sprite thường dùng canvas `256×256 px`; nhân vật dáng ngang giữ canvas theo tỉ lệ riêng để không bị méo:

```text
monster.png         256×256 → Âm Thư Yêu 音 (MONSTERS.yin)
mon_red_dai.png    256×256 → Đại Vương 大 (MONSTERS.dai)
mon_purple_nen.png 256×256 → Niên Thú 年 (MONSTERS.nen)
mon_blue_kuni.png  256×256 → Quốc Vương 国 (MONSTERS.kuni; tạm dùng chung cho MONSTERS.fish)
mon_yellow_ri.png  256×256 → Nhật Quang 日 (MONSTERS.ri)
mon_gray_bar.png   256×151 → Nhất Bản 一 (MONSTERS.bar)
```

Sprite Kanjj ưu tiên convention theo Kanji và growth stage ở thư mục `asset/`:

```text
asset/<Kanji-character>/baby.png
asset/<Kanji-character>/adult.png
asset/<Kanji-character>/prime.png
```

Ví dụ với `日`: `asset/日/baby.png`, `asset/日/adult.png`, `asset/日/prime.png`.

Khi file chưa tồn tại, game tự dựng placeholder và vẫn chạy. Panel “Asset đang dùng placeholder” trong game sẽ liệt kê đúng đường dẫn nên bổ sung.
